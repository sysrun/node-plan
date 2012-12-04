var Plan = require('../')
  , assert = require('assert');

var SmoothTask = {
  start: function(done) {
    var self = this;
    self.exports.amountTotal = 30;
    var interval = setInterval(function() {
      self.exports.amountDone += 1;
      if (self.exports.amountDone === 30) {
        clearInterval(interval);
        self.exports.complete = true;
        done();
      } else {
        self.emit('progress');
      }
    }, 10);
  }
};

var FastTask = {
  exports: {
    foo: {
      bar: "abcd"
    },
    derp: true,
    amountTotal: 2,
  },
  start: function(done) {
    var self = this;
    self.exports.derp = "hi";
    self.emit('update');
    setTimeout(function() {
      self.amountDone = 1;
      self.emit('progress');
      setTimeout(function() {
        self.exports.complete = true;
        done();
      });
    }, 10);
  },
};

var SyncTask = {
  start: function(done) {
    this.context.foo = "foo2";
    this.context.tails = this.options.tails;
    this.exports.sonic = this.options.sonic || "zebra";
    done();
  }
};

var ErrorTask = {
  exports: {
    amountTotal: 20
  },
  start: function(done) {
    var self = this;
    var interval = setInterval(function() {
      self.exports.amountDone += 1;
      self.emit('progress');
      if (self.exports.amountDone === 10) {
        clearInterval(interval);
        var err = new Error("ErrorTask - this error is expected");
        err.isErrorTask = true;
        done(err);
      }
    }, 10);
  }
};

describe("plan", function() {
  var planId = 0;
  it("a single task", function(done) {
    var plan = new Plan(planId++);
    var task = Plan.createTask(SmoothTask);
    var info = task.exports;
    plan.addTask(task);
    plan.on('error', done);
    var progress = 0;
    var progressEventCount = 0;
    plan.on('progress', function(amountDone, amountTotal) {
      var newProgress = amountDone / amountTotal;
      assert(newProgress >= progress, "old progress: " + progress + ", new progress: " + newProgress);
      progressEventCount += 1;
      progress = newProgress;
    });
    var updateEventCount = 0;
    plan.on('update', function(updatedTask) {
      updateEventCount += 1;
      assert.strictEqual(updatedTask, task);
      assert.strictEqual(updatedTask.exports, info);
    });
    plan.on('end', function() {
      assert(progressEventCount >= 3);
      assert(updateEventCount >= 2);
      done();
    });
    plan.start();
  });
  it("has access to task options, context, and exports", function(done) {
    var plan = new Plan();
    var task = Plan.createTask(SyncTask, {sonic: "rock", tails: "ice"});
    var info = task.exports;
    plan.addTask(task);
    plan.on('error', done);
    var progress = 0;
    var progressEventCount = 0;
    plan.on('progress', function(amountDone, amountTotal) {
      var newProgress = amountDone / amountTotal;
      assert(newProgress >= progress, "old progress: " + progress + ", new progress: " + newProgress + ", amountDone: " + amountDone + ", amountTotal: " + amountTotal);
      progressEventCount += 1;
      progress = newProgress;
    });
    var updateEventCount = 0;
    plan.on('update', function(updatedTask) {
      updateEventCount += 1;
      assert.strictEqual(updatedTask, task);
      assert.strictEqual(updatedTask.exports, info);
    });
    plan.on('end', function(results) {
      assert.strictEqual(results.foo, "foo2");
      assert.strictEqual(results.tails, "ice");
      assert.strictEqual(info.sonic, "rock");
      assert.strictEqual(info.amountDone, 1);
      assert.strictEqual(info.amountTotal, 1);
      assert.strictEqual(progressEventCount, 1)
      assert.strictEqual(updateEventCount, 2);
      done();
    });
    plan.start({foo: "hi"});
  });
  it("emits errors", function(done) {
    var plan = new Plan();
    var errorTask = Plan.createTask(ErrorTask);
    var fastTask = Plan.createTask(FastTask);
    var smoothTask = Plan.createTask(SmoothTask);
    plan.addTask(errorTask);
    plan.addDependency(errorTask, fastTask);
    plan.addDependency(fastTask, smoothTask);
    plan.on('error', function(err) {
      assert.ok(err.isErrorTask);
      assert.strictEqual(fastTask.exports.derp, "hi");
      assert.strictEqual(fastTask.exports.complete, true);
      assert.strictEqual(smoothTask.exports.complete, true);
      done();
    });
    plan.on('end', function() {
      assert.fail("not supposed to reach end");
    });
    plan.start();
  });
  it("2 sequential tasks", function(done) {
    // context should be passed
    assert.fail();
  });
  it("a task with 2 dependencies", function(done) {
    // both dependencies should be complete
    assert.fail();
  });
  it("smooth progress on 2nd try with tasks that do not emit progress", function(done) {
    assert.fail();
  });
  it("emits progress even when no tasks are emitting progress", function(done) {
    assert.fail();
  });
  it("heuristics take plan id into account", function(done) {
    assert.fail();
  });
  it("limits cpu bound tasks to one cpu core", function(done) {
    assert.fail();
  });
});
