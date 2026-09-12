import fs from "fs-extra";

export async function injectSlot(
	filePath: string,
	slotMarker: string,
	contentToInject: string,
): Promise<void> {
	if (!(await fs.pathExists(filePath))) {
		console.warn(`[generator] injectSlot: target file does not exist, skipping: ${filePath}`);
		return;
	}

	let fileContent = await fs.readFile(filePath, "utf-8");

	if (fileContent.includes(contentToInject.trim())) return;

	if (!fileContent.includes(slotMarker)) {
		console.warn(`[generator] injectSlot: marker "${slotMarker}" not found in ${filePath}, skipping`);
		return;
	}

	fileContent = fileContent.replace(slotMarker, `${slotMarker}\n${contentToInject}`);
	await fs.writeFile(filePath, fileContent, "utf-8");
}
