'use babel';

import RokuSuiteView from './roku-suite-view';
// import { CompositeDisposable } from 'atom';
import { CompositeDisposable } from 'atom';

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
      console.log('package');
  }

};
