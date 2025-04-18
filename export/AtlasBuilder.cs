using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;

namespace Source
{
    public class AtlasBuilder : IDisposable
    {
        private readonly ZipArchive archive;
        private readonly string savePath;
        
        public AtlasBuilder(string imagesArchivePath, string savePath)
        {
            archive = new ZipArchive(File.OpenRead(imagesArchivePath), ZipArchiveMode.Read);
            this.savePath = savePath;
        }

        private Image<Rgba32> LoadImageFromArchive(string path)
        {
            var entry = archive.GetEntry(path);
            if (entry == null)
            {
                path = path.Substring(0, path.Length - 4);
                foreach (var iEntry in archive.Entries)
                {
                    if (iEntry.FullName.StartsWith(path, StringComparison.Ordinal))
                    {
                        entry = iEntry;
                        break;
                    }
                }
            }

            if (entry == null)
            {
                Console.WriteLine("Unable to find archive entry for " + path);
                return null;
            }

            using var stream = entry.Open();
            return Image.Load<Rgba32>(stream);
        }
        
        public string BuildAtlas(List<string> iconsPaths)
        {
            Console.WriteLine($"Starting atlas creation with {iconsPaths.Count} icons...");
            
            var images = new List<Image<Rgba32>>();
            for (var i = 0; i < iconsPaths.Count; i++)
            {
                var path = iconsPaths[i];
                if (path == null) continue;
                
                if (i % 1000 == 0)
                {
                    Console.WriteLine($"Loading icon {i + 1} of {iconsPaths.Count}...");
                }
                
                var image = LoadImageFromArchive(path);
                if (image != null)
                {
                    images.Add(image);
                }
            }

            Console.WriteLine($"Loaded {images.Count} icons successfully.");

            if (images.Count == 0)
            {
                Console.WriteLine("No valid icons found to create atlas.");
                return null;
            }

            // Calculate required dimensions
            var iconsCount = images.Count;
            var requiredHeight = (iconsCount - 1) / (1 << IconAtlas.DimensionBits) + 1;
            var width = (1 << IconAtlas.DimensionBits) * IconAtlas.ImageSize;
            var height = requiredHeight * IconAtlas.ImageSize;

            Console.WriteLine($"Creating atlas with dimensions {width}x{height}...");

            // Create the atlas
            using var atlas = new Image<Rgba32>(width, height);
            
            // Draw all images onto the atlas
            for (var i = 0; i < images.Count; i++)
            {
                if (i % 1000 == 0)
                {
                    Console.WriteLine($"Compositing icon {i + 1} of {images.Count}...");
                }
                
                var image = images[i];
                var positionX = (i & IconAtlas.XMask) * IconAtlas.ImageSize;
                var positionY = ((i & IconAtlas.YMask) >> IconAtlas.DimensionBits) * IconAtlas.ImageSize;
                
                atlas.Mutate(x => x.DrawImage(image, new Point(positionX, positionY), 1f));
                image.Dispose();
            }

            Console.WriteLine("Resizing...");

            // Resize to 50% and save as WebP
            using var resized = atlas.Clone(x => x.Resize(width / 2, height / 2, KnownResamplers.Box));
            Console.WriteLine("Saving as WEBP...");
            var encoder = new WebpEncoder
            {
                FileFormat = WebpFileFormatType.Lossless,
                Quality = 100
            };
            
            using var fileStream = File.Create(savePath);
            resized.Save(fileStream, encoder);

            Console.WriteLine($"Atlas creation complete. Saved to: {savePath}");
            return savePath;
        }

        public void Dispose()
        {
            archive.Dispose();
        }
    }
}