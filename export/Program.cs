using Source;

namespace export;

class Program
{
    static void Main(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: export <path to nesql export directory> [<output path>]");
            return;
        }

        var path = args[0];
        var outputPath = args.Length > 1 ? args[1] : ".";

        PackGenerator.Generate(path, outputPath);
    }
}