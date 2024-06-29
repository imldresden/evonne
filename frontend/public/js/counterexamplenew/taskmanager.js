/**
 * Maximum tasks that can be stored in the undo-stack
 * @type {number}
 */
const MAX_AMOUNT_OF_UNDO_TASK = 100;

/**
 * Handles the history functionality
 */
class TaskManager {
    constructor() {
        this.tasksToUndo = [];
        this.tasksToRedo = [];
    }

    /**
     * Execute a task for the first time
     * @param {Task}task to be executed
     */
    execute(task) {
        this._executeTask(task);
        // clear the redo stack since we use linear history mode
        this.tasksToRedo = [];
    }

    /**
     * runs the execute script of a {@link Task}
     * @param {Task}task to be executed
     * @private
     */
    _executeTask(task) {
        task.redo();
        // if the stack is full remove the oldest task
        if (this.tasksToUndo.length >= MAX_AMOUNT_OF_UNDO_TASK) {
            this.tasksToUndo.shift();
        }
        // push this task to the stack of tasks that can be undone
        this.tasksToUndo.push(task);
    }

    /**
     * runs the undo script of the top element of the undo stack and pushs it to the redo stack
     */
    undo(){
        if (this.tasksToUndo.length === 0) return;
        let task = this.tasksToUndo.pop();
        task.undo();
        this.tasksToRedo.push(task)
    }

    /**
     * runs the redo script of the top element of the redo stack and pushs it to the undo stack
     */
    redo(){
        if (this.tasksToRedo.length === 0) return;
        this._executeTask(this.tasksToRedo.pop());
    }

}

/**
 * Object that represents a undoable task
 */
class Task {
    /**
     * Constructor of the task
     * @param {function}undo script to undo this task
     * @param {function}redo script to execute this task
     * @param {string}name name of the task that could be presented in a history list
     */
    constructor(undo, redo, name) {
        this.undo = undo;
        this.redo = redo;
        this.name = name;
    }
}

/**
 * Singleton Instance of the Task Manager
 * @type {TaskManager}
 */
const TASK_MANAGER = new TaskManager();

export {TASK_MANAGER, Task};

