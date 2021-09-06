import { defineMessages } from 'react-intl'

/**
 * Internationalized messages for use with Admin Manage.
 */
export default defineMessages({
  manageHeader: {
    id: 'Admin.manage.header',
    defaultMessage: "Create & Manage",
  },

  virtualHeader: {
    id: 'Admin.manage.virtual',
    defaultMessage: "Virtual",
  },

  staleChallengeMessage1: {
    id: "Admin.Challenge.controls.stale1",
    defaultMessage: "The system archived this challenge on",
  },

  staleChallengeMessage2: {
    id: "Admin.Challenge.controls.stale2",
    defaultMessage: "because it has been stale for over 6 months. If you wish to restore the challenge, simply rebuild the tasks and then select Unarchive Challenge.",
  },
})
