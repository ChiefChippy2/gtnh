export function showConfirmDialog(
    text: string,
    yesText: string | null = "Yes",
    noText: string | null = "No",
    cancelText: string | null = null
): Promise<"yes" | "no" | "cancel"> {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirm-dialog');
        const textElement = document.getElementById('confirm-text');
        const yesButton = document.getElementById('confirm-yes');
        const noButton = document.getElementById('confirm-no');
        const cancelButton = document.getElementById('confirm-cancel');

        if (!dialog || !textElement || !yesButton || !noButton || !cancelButton) {
            resolve('cancel');
            return;
        }

        // Set the text
        textElement.textContent = text;

        // Set button text and visibility
        if (yesText) {
            yesButton.textContent = yesText;
            yesButton.classList.remove('hidden');
        } else {
            yesButton.classList.add('hidden');
        }

        if (noText) {
            noButton.textContent = noText;
            noButton.classList.remove('hidden');
        } else {
            noButton.classList.add('hidden');
        }

        if (cancelText) {
            cancelButton.textContent = cancelText;
            cancelButton.classList.remove('hidden');
        } else {
            cancelButton.classList.add('hidden');
        }

        // Set up event listeners
        const handleClick = (result: "yes" | "no" | "cancel") => {
            dialog.classList.add('hidden');
            resolve(result);
        };

        yesButton.onclick = () => handleClick('yes');
        noButton.onclick = () => handleClick('no');
        cancelButton.onclick = () => handleClick('cancel');

        // Show the dialog
        dialog.classList.remove('hidden');
    });
}
