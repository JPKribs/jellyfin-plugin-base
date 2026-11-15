import type { BadgeState, BadgeColor } from './types.js';

/** The state names a badge knows, in names, the color modifiers that base-badge takes, in colors, and the color each state draws in, in stateColors. A plugin maps its own statuses onto these so the mapping has one source. */
export var BADGE_STATES: { names: BadgeState[]; colors: BadgeColor[]; stateColors: Record<BadgeState, BadgeColor> } = {
    names: [
        'Active', 'Synced', 'Downloaded', 'Imported',
        'Queued', 'Downloading', 'Pending', 'Pending-Download', 'Pending-Replacement',
        'Errored', 'Error', 'Disabled', 'Deleting', 'Pending-Deletion',
        'Expired', 'Locked', 'Admin', 'Ignored', 'Group',
        'Completed', 'Enabled', 'Failed', 'Paused', 'Running', 'Skipped', 'Unknown'
    ],
    colors: ['green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', 'teal'],
    stateColors: {
        'Active': 'green', 'Synced': 'green', 'Downloaded': 'green', 'Completed': 'green', 'Enabled': 'green',
        'Disabled': 'red', 'Errored': 'red', 'Error': 'red', 'Deleting': 'red', 'Pending-Deletion': 'red', 'Failed': 'red',
        'Expired': 'orange', 'Queued': 'orange', 'Paused': 'orange',
        'Locked': 'purple', 'Running': 'purple', 'Downloading': 'purple', 'Pending': 'purple', 'Pending-Download': 'purple',
        'Admin': 'blue', 'Imported': 'blue', 'Pending-Replacement': 'blue',
        'Ignored': 'gray', 'Group': 'gray', 'Skipped': 'gray', 'Unknown': 'gray'
    }
};
