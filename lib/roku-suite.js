'use babel';

import RokuSuiteView from './roku-suite-view';
import { CompositeDisposable } from 'atom';
const fs = require('fs');

export default {
    rokuSuiteView: null,
    modalPanel: null,
    subscriptions: null,
    rootDir: null,

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
        this.rootDir = atom.project.getDirectories()[0].getRealPathSync();

        // add .roku-suite
        if (!fs.existsSync(`${this.rootDir}/.roku-suite`)) {
            fs.mkdirSync(`${this.rootDir}/.roku-suite`);
            fs.mkdirSync(`${this.rootDir}/.roku-suite/out`);
            // add roku-suite to .gitignore
            if (fs.existsSync(`${this.rootDir}/.gitignore`)) {
                fs.appendFileSync(`${this.rootDir}/.gitignore`, `.roku-suite`);
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
        fs.readdir(this.rootDir, function(err, dirs) {
            for (var i=0; i<items.length; i++) {
                console.log(dirs[i]);
            }
        });
    }

};
