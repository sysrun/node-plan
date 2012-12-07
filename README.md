[![Build Status](https://secure.travis-ci.org/superjoe30/node-plan.png?branch=master)](https://travis-ci.org/superjoe30/node-plan)

# node-plan

Execute a complicated dependency graph of tasks with smooth progress events.

## Usage

### Create tasks

Here are some examples:

 * [waveform](https://github.com/superjoe30/node-plan-waveform)
 * [callback](https://github.com/superjoe30/node-plan-callback)
 * [s3-upload](https://github.com/superjoe30/node-plan-s3-upload)
 * [s3-download](https://github.com/superjoe30/node-plan-s3-download)
 * [thumbnail](https://github.com/superjoe30/node-plan-thumbnail)
 * [transcode](https://github.com/superjoe30/node-plan-transcode)

### Execute a plan

In this example, we will download a song from s3, generate a waveform image
and preview audio, and upload each generated thing to s3, all the while
reporting smooth and accurate processing progress to the end user.

```js
var Plan = require('plan')
  , WaveformTask = require('plan-waveform')
  , TranscodeTask = require('plan-transcode')
  , UploadS3Task = require('plan-s3-upload')
  , DownloadS3Task = require('plan-s3-download')

var downloadTask = Plan.createTask(DownloadS3Task, "download", {
  s3Key: '...',
  s3Bucket: '...',
  s3Secret: '...',
})
var waveformTask = Plan.createTask(WaveformTask, "waveform", {
  width: 1000,
  height: 200,
});
var previewTask = Plan.createTask(TranscodeTask, "preview", {
  format: 'mp3'
});
var uploadWaveformTask = Plan.createTask(UploadS3Task, "upload-waveform", {
  url: "/{uuid}/waveform{ext}"
  s3Key: '...',
  s3Bucket: '...',
  s3Secret: '...',
})
var uploadPreviewTask = Plan.createTask(UploadS3Task, "upload-preview", {
  s3Key: '...',
  s3Bucket: '...',
  s3Secret: '...',
})

// planId is used to index progress statistics. Same with the 2nd parameter
// to `Plan.createTask` above. Next time we run the same planId, node-plan
// uses the gathered stats to inform the progress events, so that they will
// be much more accurate and smooth.
var planId = "process-audio";

var plan = new Plan(planId);
plan.addTask(uploadPreviewTask);
plan.addDependency(uploadPreviewTask, previewTask);
plan.addDependency(previewTask, downloadTask);
plan.addTask(uploadWaveformTask);
plan.addDependency(uploadWaveformTask, waveformTask);
plan.addDependency(waveformTask, downloadTask);
plan.on('error', function(err) {
  console.log("error:", err);
});
plan.on('progress', function(amountDone, amountTotal) {
  console.log("progress", amountDone, amountTotal);
});
plan.on('update', function(task) {
  console.log("update", task.exports);
});
plan.on('end', function() {
  console.log("done");
});
context = {
  s3Url: '/the/file/to/download',
  makeTemp: require('temp').path
};
plan.start(context);
```

## Documentation

### Creating a Task Definition

```js
var TaskDefinition = {};
```

#### start

```js
TaskDefinition.start = function(done) {
  ...
};
```

`start` is your main entry point. When you are finished processing, call 
`done`. In this scope, `this` points to the task instance.

#### context

`context` acts as your input as well as your output. Sometimes it makes
sense to delete the parameter that you are using; sometimes it does not.

Access `context` via `this.context` in the `start` function.

#### exports

`exports` is output that is tied to the task instance and is not passed to
the next task in the dependency graph.

There are some special fields on `exports` that you should be wary of:

Fields you should write to:

 * `exports.amountTotal` - as soon as you find out how long executing this
   task is going to take, set `amountTotal`. If the task is unable to emit
   progress, node-plan will guess based on previous statistics.
 * `exports.amountDone` - this number will change based on progress whereas
   `amountTotal` should not.

Whenever you update `amountDone` or `amountTotal`, you should emit a
`progress` event: `this.emit('progress')`. Don't worry about emitting
an `update` event for this case.

Fields you should not write to:

 * `exports.startDate` - the date the task instance started
 * `exports.endDate` - the date the task instance completed
 * `exports.state` - one of ['queued', 'processing', 'complete']

You are free to add as many other `exports` fields as you wish.

Whenever you change something in `exports`, you should emit a `update`
event: `this.emit('update')`.

Access `exports` via `this.exports` in the `start` function.

#### options

`options` are per-task-instance configuration values. It is the third
parameter of `Plan.createTask(definition, key, options)`.

Access `options` via `this.options` in the `start` function.

#### CPU Bound Tasks

If your task spawns a CPU-intensive process and waits for it to complete,
you should mark your task as `cpuBound`:

```js
TaskDefinition.cpuBound = true;
```

node-plan pools all `cpuBound` tasks, defaulting to a worker count equal
to the number of CPU cores on your machine.

### Executing a Plan
