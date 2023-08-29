import Admonition144 from "main";
import { watch, FSWatcher, link } from "fs";

export class fileWatcher {
    mainPlugin: Admonition144;
    watcher: FSWatcher;
    fileNameBuffer: customNameBuffer;

    /**
    * Class used to contruct the fileWatcher and call subclasses
    * 
    * @param plugin Main plugin
    */
    constructor(plugin: Admonition144) {
        this.mainPlugin = plugin;
        this.fileNameBuffer = new customNameBuffer(plugin);
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
    mainPlugin: Admonition144;
    nameBuffer: Array<string>;  // Variable where we append the old and new names

    /**
    * Class used to contruct the news file.
    * 
    * @param plugin Main plugin
    */
    constructor(plugin: Admonition144) {
        this.mainPlugin = plugin;
        this.nameBuffer = new Array<string>;
    }

    addChangeName(fileName: string){
        this.nameBuffer.push(fileName);
        if (this.nameBuffer.length >= 2) {
            let oldName: string = this.nameBuffer[0];
            let newName: string = this.nameBuffer[1];
            console.log(`Detected renaming of file ${oldName} to ${newName}`)
        }
    }
}

// Now we have to scan all vault and look for links containing file name. then change these links. Maybe ask the user for confirmation

function getMinimumLinkFromFileName(fileName: string): string{
    let res: string = fileName;
    res = res.split('/').pop();
    // Test/TestFolder\MyTestLink.md -> TestFolder\MyTestLink.md
    res = res.split('\\').pop();
    // TestFolder\MyTestLink.md -> MyTestLink.md
    res = res.split(`.`)[0];
    // MyTestLink.md -> MyTestLink
    return res
}