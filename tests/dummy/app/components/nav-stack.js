import Ember from 'ember';
import { NavStack, MicroRouter } from 'ember-constraint-router/-nav-stack';

export default Ember.Component.extend({
  _stateString: '_unset_',
  stateString: '',
  frames: null,
  navStack: null,

  init(...args) {
    this._super(...args);

    this.navStack = new NavStack({
      onNewFrames: (frames) => {
        this.set('frames', frames);

        this._stateString = JSON.stringify(frames.map(f => ({ url: f.componentName })));
        this.set('stateString', this._stateString);
      }
    });

    this.didUpdateStateString();
  },

  didUpdateStateString: Ember.observer('stateString', function() {
    let stateString = this.get('stateString');
    if (stateString !== this._stateString) {
      this._stateString = stateString;
      this.navStack.didUpdateStateString(stateString);
    }
  }),
});