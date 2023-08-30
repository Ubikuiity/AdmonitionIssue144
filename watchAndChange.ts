import Admonition144 from "main";
import { watch, FSWatcher, link } from "fs";
import { TFile } from "obsidian";

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
        }
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

        for (let mdFile of files) {
            const content: string = await this.mainPlugin.app.vault.cachedRead(mdFile);
            const minimalLink: string = getMinimumLinkFromFileName(oldName)

            // First check to avoid further inspection of most of files
            if (content.includes(minimalLink)) {
                // Now, let's look at all admonition codeblocks, we will get them via a regex
                const reAdmonitionCodeblocks = new RegExp(`\\\`{3} *ad[^\\\`]*\\\`{3}`, "g");
            }
        }
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