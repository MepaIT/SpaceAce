const assert = require('assert');
const Space = require('../index');

describe('Space', function() {
  beforeEach(function() {
    this.space = new Space({ initialState: 'here', count: 1, child: {} });
  });

  it('returns Space instance', function() {
    assert(new Space() instanceof Space);
  });

  it('spaces only have these enumerated keys', function() {
    const childSpace = this.space.subSpace('child');
    assert.deepEqual(Object.keys(this.space), ['state', 'doAction', 'subSpace']);
    assert.deepEqual(Object.keys(childSpace), ['state', 'doAction', 'subSpace']);
  });

  it('has initial state', function() {
    assert.deepEqual(this.space.state, { initialState: 'here', count: 1, child: {} });
  });

  it('updates the state', function() {
    const oldState = this.space.state;
    this.space.doAction(({ state }) => ({ count: state.count + 1 }))();
    assert.deepEqual(this.space.state, { initialState: 'here', count: 2, child: {} });
    assert.notEqual(this.space.state, oldState);
  });

  it('actions pass in event', function() {
    let called = false;
    this.space.doAction((space, event) => { called = event.called; })({ called: 'once' });
    assert.equal(called, 'once');
  });

  it('registers subscribers', function() {
    const subscriber = function() { return { success: true }; };
    this.space.subscribe(subscriber);
    assert.equal(this.space.subscribers[0], subscriber);
  });

  describe('child spaces', function() {
    beforeEach(function() {
      this.subSpaceByName = this.space.subSpace('child');
      this.subSpaceByAction = this.space.doAction(({ subSpace }) => ({
        actionChild: subSpace({ value: 'present' })
      }))();
    });

    it('propagates changes upwards', function() {
      this.subSpaceByName.doAction(() => ({ value: 'is there' }))();
      assert.equal(this.space.state.child.value, 'is there');
    });

    it('uses existing sub space', function() {
      assert.equal(this.space.subSpace('child'), this.subSpaceByName);
    });

    it('supports adding subspaces by action', function() {
      assert(this.space.children.actionChild);
      assert.equal(this.space.state.actionChild.value, 'present');
    });

    it('removes spaces by returning null for that space', function() {
      assert(this.space.state.child);
      this.space.doAction(() => ({ child: null }))();
      assert.equal(this.space.state.child, null);
    });

    it('throws list subSpaces missing id', function() {
      assert.throws(() => {
        this.space.doAction(({ subSpace }) => ({
          list: [subSpace({ value: 'present' })]
        }))();
      });
    });

    describe('child spaces in lists', function() {
      beforeEach(function() {
        this.space.doAction(({ subSpace }) => ({
          list: [subSpace({ value: 'present', id: 'abc12-3' })]
        }))();
      });

      it('supports subSpaces in lists', function() {
        assert.deepEqual(this.space.state, {
          initialState: 'here',
          count: 1,
          child: {},
          actionChild: { value: 'present' },
          list: [{value: 'present', id: 'abc12-3' }]
        });
      });

      it('can get spaces from list', function() {
        const listItemSpace = this.space.subSpace('list', 'abc12-3');
        assert.equal(listItemSpace.state.value, 'present');
      });

      it('removes spaces when null is returned from action', function() {
        const listItemSpace = this.space.subSpace('list', 'abc12-3');
        assert.equal(this.space.state.list.length, 1);
        listItemSpace.doAction(() => null)();
        assert.equal(this.space.state.list.length, 0);
      });

      it('provides a key prop', function() {
        assert('key' in this.space.subSpace('list', 'abc12-3'));
        assert.equal(this.space.subSpace('list', 'abc12-3').key, 'abc12-3');
      });
    });


  });
});