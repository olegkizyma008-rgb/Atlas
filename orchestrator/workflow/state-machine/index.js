/**
 * State Machine Module Index
 * 
 * Exports WorkflowStateMachine and handlers
 */

module.exports = {
    WorkflowStateMachine: require('./WorkflowStateMachine'),
    ...require('./handlers')
};
