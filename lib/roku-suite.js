'use babel';

import RokuSuiteView from './roku-suite-view';
import { CompositeDisposable } from 'atom';
const fs = require('fs');
const archiver = require('archiver');
const request = require('request');

let baseName;
let zipPaths = {
    dirs: [],
    files: []
};
let rootDir;
let archiveDir;

export default {
    rokuSuiteView: null,
    modalPanel: null,
    subscriptions: null,
    config: {
        rokuName:{
            type: 'string',
            default: 'myRoku'
        },
        rokuIP: {
            type: 'string',
            default: '1111'
        },
        rokuUserId: {
            type: 'string',
            default: 'rokudev'
        },
        rokuPassword: {
            type: 'string',
            default: '1234'
        },
    },

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
            'roku-suite:package': () => this.package(),
            'roku-suite:deploy': () => this.deploy()
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
        // Add roku
        this.rokuName = atom.config.get('roku-suite.rokuName');
        this.rokuIP = atom.config.get('roku-suite.rokuIP');
        this.rokuUserId = atom.config.get('roku-suite.rokuUserId');
        this.rokuPassword = atom.config.get('roku-suite.rokuPassword');
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

    compileZip() {
        return new Promise((resolve, reject) => {
            // create a file to stream archive data to.
            let outPath = `${rootDir}/.roku-suite/out`;
            let output = fs.createWriteStream(outPath + '/archive.zip');
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
                archive.directory(`${rootDir}/${zipPaths.dirs[i]}`, `${zipPaths.dirs[i]}`);
            }
            // add iles to zip
            for( let i=0; i<zipPaths.files.length; i++ ) {
                archive.append(fs.createReadStream(`${rootDir}/${zipPaths.files[i]}`), { name: `${zipPaths.files[i]}` });
                // archive.directory(`${rootDir}/${zipPaths.files[i]}`, false);
            }

            // complete
            resolve(archive);
        });
    },

    package() {
        console.log('package');
        atom.notifications.addInfo('Packaging Started');
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

            module.exports.compileZip().then((archive) => {
                // finalize zip file upon compilation
                archive.finalize();
            }).catch((err) => {
                // notfiy error
                atom.notifications.addError(err);
            });
        });
    },

    deploy() {
        console.log('deploy');
        atom.notifications.addInfo(`Deployment to ${this.rokuName}@${this.rokuIP} started`);
        if ( !fs.existsSync(`${rootDir}/.roku-suite/out/archive.zip`) ) {
            console.log('no archive found');
            return atom.notifications.addWarning(`No app packaged`);
        }

        let connection = {
            url : `http://${this.rokuIP}/plugin_install`,
            formData : {
                mysubmit : 'Replace',
                archive : fs.createReadStream(`${rootDir}/.roku-suite/out/archive.zip`)
            }
        };
        console.log('connecting');
        request.post(connection, this.requestCallback).auth(this.rokuUserId, this.rokuPassword, false);
    },

    requestCallback(error, response, body) {
      if ((response !== undefined) && (response.statusCode !== undefined) && (response.statusCode === 200)) {
          if (response.body.indexOf("Identical to previous version -- not replacing.") !== -1) {
              return atom.notifications.addWarning("Deploy cancelled by Roku: the package is identical to the package already on the Roku.");
          } else {
              console.log("Successfully deployed");
              return atom.notifications.addSuccess(`Deployed to ${module.exports.rokuName}@${module.exports.rokuIP}`);
          }
      } else {
          atom.notifications.addFatalError(`Failed to deploy to ${module.exports.rokuName}@${module.exports.rokuIP} see console output for details.`);
          console.log(error);
          if (response !== undefined) {
              return console.log(response.body);
          }
      }
    },
};
