'use babel';

import RokuSuiteView from './roku-suite-view';
import { CompositeDisposable } from 'atom';
const fs = require('fs');
const archiver = require('archiver');

let baseName;
let zipPaths = {
    dirs: [],
    files: []
};
let rootDir;

function compileZip() {
    return new Promise((resolve, reject) => {
        // create a file to stream archive data to.
        let outPath = `${rootDir}/.roku-suite/out`;
        let output = fs.createWriteStream(outPath + '/app.zip');
        let archive = archiver('zip');

        // listen for all archive data to be written
        output.on('close', function() {
            atom.notifications.addInfo("Zip file compiled");
        });

        // handle archiver errors
        archive.on('error', function(err) {
            atom.notifications.addError("Zip file failed to compile");
            // throw err;
            reject(err);
        });

        // pipe archive data to the file
        archive.pipe(output);

        // add dirs to zip
        for( let i=0; i<zipPaths.dirs.length; i++ ) {
            archive.directory(`${rootDir}/${zipPaths.dirs[i]}`, `${baseName}/${zipPaths.dirs[i]}`);
        }
        // add iles to zip
        for( let i=0; i<zipPaths.files.length; i++ ) {
            archive.append(fs.createReadStream(`${rootDir}/${zipPaths.files[i]}`), { name: zipPaths.files[i] });
        }

        // complete
        resolve(archive);
    });
}

export default {
    rokuSuiteView: null,
    modalPanel: null,
    subscriptions: null,

    activate(state) {
        this.rokuSuiteView = new RokuSuiteView(state.rokuSuiteViewState);
        this.modalPanel = atom.workspace.addModalPanel({
            item: this.rokuSuiteView.getElement(),
            visible: false
        });

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'roku-suite:toggle': () => this.toggle(),
            'roku-suite:package': () => this.package()
        }));

        // set root dir
        rootDir = atom.project.getDirectories()[0].getRealPathSync();
        baseName = atom.project.getDirectories()[0].getBaseName();

        // add .roku-suite
        if (!fs.existsSync(`${rootDir}/.roku-suite`)) {
            fs.mkdirSync(`${rootDir}/.roku-suite`);
            fs.mkdirSync(`${rootDir}/.roku-suite/out`);
            // add roku-suite to .gitignore
            if (fs.existsSync(`${rootDir}/.gitignore`)) {
                fs.appendFileSync(`${rootDir}/.gitignore`, `.roku-suite`);
            }
        }
    },

    deactivate() {
        this.modalPanel.destroy();
        this.subscriptions.dispose();
        this.rokuSuiteView.destroy();
    },

    serialize() {
        return {
            rokuSuiteViewState: this.rokuSuiteView.serialize()
        };
    },

    toggle() {
        console.log('RokuSuite was toggled!');
        return (
            this.modalPanel.isVisible() ?
            this.modalPanel.hide() :
            this.modalPanel.show()
        );
    },

    package() {
        // clear zipPaths
        zipPaths = {
            dirs: [],
            files: []
        };

        // get required file paths/compile zip
        fs.readdir(rootDir, function(err, dirs) {
            for (let i=0; i<dirs.length; i++) {
                if ( dirs[i][0] !== '.' ) {
                    if( fs.lstatSync(`${rootDir}/${dirs[i]}`).isDirectory() ) {
                        zipPaths.dirs.push(dirs[i]);
                    } else {
                        zipPaths.files.push(dirs[i]);
                    }
                }
            }

            compileZip().then((archive) => {
                // finalize zip file upon compilation
                archive.finalize();
            }).catch((err) => {
                // notfiy error
                atom.notifications.addError(err);
            });
        });
    }
};
