import Admonition144 from "main";
import { watch, FSWatcher, writeFile } from "fs";
import { TFile } from "obsidian";
import * as path from "path";

// This interface is needed to represent a link in a file
class fileLink {
    pointedFile: TFile;  // The file being linked
    linkString: string;  // The string that contains the link to the file
    originalFile: TFile;  // The file containing the link

    /**
     * Class used to contruct the link object
     * 
     * @param pFile file being pointed by the link
     * @param linkString string of the link [[XXXXX]]
     * @param oFile file containing the link
     */
     constructor(pFile: TFile, linkString: string, oFile: TFile) {
        this.pointedFile = pFile;
        this.linkString = linkString;
        this.originalFile = oFile;
    }
}

export class fileWatcher {
    mainPlugin: Admonition144;
    watcher: FSWatcher;
    fileNameBuffer: customNameBuffer;
    linksFinder: formerLinksReplacer;

    /**
    * Class used to contruct the fileWatcher and call subclasses
    * 
    * @param plugin Main plugin
    */
    constructor(plugin: Admonition144) {
        this.mainPlugin = plugin;
        this.linksFinder = new formerLinksReplacer(plugin);
        this.fileNameBuffer = new customNameBuffer(this);
    }

    monitorChanges() {
        const basePath = (this.mainPlugin.app.vault.adapter as any).basePath;
        this.watcher = watch(basePath, {recursive: true}, (eventType, fileName) => {
            if (eventType=="rename")
            {
                // TODO Need to add the case of directory renames...
                if (fileName && !(fileName.includes(".obsidian")))
                {
                    this.fileNameBuffer.addChangeName(fileName);
                }
            }
        })
    }

    unmonitorChanges()
    {
        this.watcher.close()
    }
}

class customNameBuffer {
    fWatcher: fileWatcher;
    nameBuffer: Array<string>;  // Variable where we append the old and new names

    /**
    * Class used to contruct the name buffer.
    * 
    * @param fWatcher main watcher of files changes
    */
    constructor(fWatcher: fileWatcher) {
        this.fWatcher = fWatcher;
        this.nameBuffer = new Array<string>;
    }

    addChangeName(fileName: string) {
        this.nameBuffer.push(fileName);
        if (this.nameBuffer.length >= 2) {
            let oldName: string = this.nameBuffer[0];
            let newName: string = this.nameBuffer[1];
            console.log(`Detected renaming of file ${oldName} to ${newName}`);
            this.fWatcher.linksFinder.replaceLinks(oldName, newName);

            // clear buffer after calling the function that will replace links
            this.clearBuffer();
        }
    }

    clearBuffer() {
        this.nameBuffer = [];
    }
}

class formerLinksReplacer {
    mainPlugin: Admonition144;
    /**
    * Class used to detect links between files
    * 
    * @param plugin Main plugin
    */
    constructor(plugin: Admonition144) {
        this.mainPlugin = plugin;
    }
    
    // Get list of admonition links in all files
    async replaceLinks(oldName: string, newName: string) {
        // Go through each file to check if there is a link to the file that has been renamed
        const files = this.mainPlugin.app.vault.getMarkdownFiles();
        const minimalLink: string = getMinimumLinkFromFileName(oldName);

        for (let mdFile of files) {
            // vault is too long to update so it will bring an error if it tries to read a file which name just has been changed
            if (mdFile.name == `${minimalLink}.md`) continue;

            // console.log(`going through file ${mdFile.name}`);
            const content: string = await this.mainPlugin.app.vault.cachedRead(mdFile);

            // First check to avoid further inspection of most of files
            if (content.includes(minimalLink)) {
                // This file needs further inspection, beginning of analysis of the file ...
                console.log(`Looking in depth in file ${mdFile.name} ...`);
                // Prepare for potential changes to the file
                let rewrittenContent: string[] = [];  // This stores the content that will be rewritten in file
                let hasChanged: Boolean = false;   // This boolean monitor if we need to rewrite the file or not at the end of analysis

                // Now, let's look at all admonition codeblocks, we will get them via a regex
                const reAdmonitionCodeblocks = new RegExp(`\\\`{3} *ad[^\\\`]*\\\`{3}`);

                let remainingText: string = content;

                let regexMatch: RegExpMatchArray | null;
                while ((regexMatch = remainingText.match(reAdmonitionCodeblocks)) !== null) {  // While we keep finding codeblocks
                    console.log(`Found CodeBlock ${regexMatch}`);
                    let codeBlockText = regexMatch[0];
                    const splitContent: string[] = splitFirstOccurrence(remainingText, codeBlockText);
                    rewrittenContent.push(splitContent[0]);  // Add the first part of split to rewritten content

                    // Regexp to find links containing the minimal link to the file being renamed
                    const reLinksToReplace = new RegExp(`\\[{2}.*${minimalLink}.*\\]{2}`);
                    let linkMatch: RegExpMatchArray | null;
                    while ((linkMatch = codeBlockText.match(reLinksToReplace)) !== null) {  // While we keep finding links
                        console.log(`Found link ${linkMatch}`);
                        let linkToReplace = linkMatch[0];
                        const splitCodeBlock: string[] = splitFirstOccurrence(codeBlockText, linkToReplace);
                        rewrittenContent.push(splitCodeBlock[0])  // Add the first part of codeBlock to rewritten content
                        
                        // The use of this regex is to be extra cautious in case a folder name or the description of the link contains the minimal link
                        // The regex isolates the part that contains only the name of the file + the space and | or ]] following it
                        const reWordsToReplace = new RegExp(`${minimalLink} *(\\||\\]{2})`);
                        const wordsToReplaceMatch: RegExpMatchArray | null = linkToReplace.match(reWordsToReplace);
                        // Check that we have a match, else we issue a warning
                        if (!wordsToReplaceMatch) {
                            // This warning is normal if link contains the name of renamed file but doesn't point towards that file
                            console.warn(`Unexpected link syntax, Could not change link ${linkToReplace} in file ${oldName}`);
                            // Set everything for skipping
                            rewrittenContent.push(linkToReplace);
                            codeBlockText = splitCodeBlock[1];
                            continue;  // skip this particular link
                        }

                        // replace the part of the link
                        let wordsToReplace = wordsToReplaceMatch[0];
                        const newMinimalLink: string = getMinimumLinkFromFileName(newName);
                        let replacedWords = wordsToReplace.replace(minimalLink, newMinimalLink);

                        // gets the new link
                        let newLinkArray: string[] = splitFirstOccurrence(linkToReplace, wordsToReplace);
                        newLinkArray.splice(1, 0, replacedWords); // Add the modified part in the middle

                        // Add new link to rewritten content and set hasChanged to note that we made some changes
                        rewrittenContent.push(newLinkArray.join(""));
                        hasChanged = true;

                        codeBlockText = splitCodeBlock[1];
                    }

                    // When we finished analysing all links, add end of codeBlock to the rewritten content
                    rewrittenContent.push(codeBlockText)
                    
                    // Now we remove the codeBlock we analysed and all above of the text to keep looking for more codeblocks
                    remainingText = splitContent[1];
                }
                rewrittenContent.push(remainingText);  // When we finished analysing all codeBlocks, add remaining text to rewritten content
                
                // Analysis of the file is over now, check if we found some links to change in file
                if (hasChanged) {
                    this.reWriteFile(mdFile, rewrittenContent.join(""));
                }
            }
        }
    }

    // This rewrites the file
    async reWriteFile(file: TFile, content: string) {
        const basePath = (this.mainPlugin.app.vault.adapter as any).basePath;
        const finalSavePath: string = path.join(basePath, file.path);

        console.log(`rewriting file... :\n ${finalSavePath}`);
        const data = new Uint8Array(Buffer.from(content));
        writeFile(finalSavePath, data, (err) => {if (err) throw err;});
    }
}

/**
* Function that returns the minimal string to link a file given the full path of the file
*
* For example : Test/TestFolder\MyTestLink.md -> MyTestLink
* 
* @param fileName relative path of file (from vault root)
*/
function getMinimumLinkFromFileName(fileName: string): string {
    let res: string = fileName;
    res = res.split('/').pop();
    // Test/TestFolder\MyTestLink.md -> TestFolder\MyTestLink.md
    res = res.split('\\').pop();
    // TestFolder\MyTestLink.md -> MyTestLink.md
    res = res.split(`.`)[0];
    // MyTestLink.md -> MyTestLink
    return res
}

/**
* Function that splits on string only on the first occurence of the separator
*/
function splitFirstOccurrence(str: string, separator: string) {
    const [first, ...rest] = str.split(separator);
    const remainder = rest.join(separator);
    return [first, remainder];
}