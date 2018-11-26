import React, { Component } from 'react'
import PropTypes from 'prop-types'
import _get from 'lodash/get'
import _map from 'lodash/map'
import _findIndex from 'lodash/findIndex'
import _isObject from 'lodash/isObject'
import { FormattedMessage } from 'react-intl'
import WithCurrentUser from '../../HOCs/WithCurrentUser/WithCurrentUser'
import WithSortedChallenges from '../../HOCs/WithSortedChallenges/WithSortedChallenges'
import WithPagedChallenges from '../../HOCs/WithPagedChallenges/WithPagedChallenges'
import ChallengeResultItem from '../ChallengeResultItem/ChallengeResultItem'
import PageResultsButton from './PageResultsButton'
import BusySpinner from '../../BusySpinner/BusySpinner'
import StartVirtualChallenge from './StartVirtualChallenge'
import messages from './Messages'
import './ChallengeResultList.scss'

/**
 * ChallengeResultList applies the current challenge filters and the given
 * search to the given challenges, displaying the results as a list of
 * ChallengeResultItems.
 *
 * @see See ChallengeResultItem
 *
 * @author [Neil Rotstan](https://github.com/nrotstan)
 */
export class ChallengeResultList extends Component {
  render() {
    const challengeResults = this.props.pagedChallenges

    // If the user is actively browsing a challenge, include that challenge even if
    // it didn't pass the filters.
    if (_isObject(this.props.browsedChallenge) && !this.props.loadingBrowsedChallenge) {
      if (this.props.browsedChallenge.isVirtual ||
          _findIndex(challengeResults, {id: this.props.browsedChallenge.id}) === -1) {
        challengeResults.push(this.props.browsedChallenge)
      }
    }

    // If there are map-bounded tasks visible (and we're not browsing a
    // challenge), offer the user an option to start a virtual challenge to
    // work on those mapped tasks.
    let virtualChallengeOption = null
    if (_get(this.props, 'mapBoundedTasks.tasks.length', 0) > 0 &&
        !_isObject(this.props.browsedChallenge)) {
      virtualChallengeOption =
        <StartVirtualChallenge
          {...this.props}
          taskCount={this.props.mapBoundedTasks.tasks.length}
          createVirtualChallenge={this.props.startMapBoundedTasks}
          creatingVirtualChallenge={this.props.creatingVirtualChallenge} />
    }

    let results = null
    if (challengeResults.length === 0) {
      results = (
        <div className="mr-text-white mr-text-lg mr-pt-4">
          <span><FormattedMessage {...messages.noResults} /></span>
          {_get(this.props, 'fetchingChallenges', []).length > 0 &&
           <BusySpinner />
          }
        </div>
      )
    }
    else {
      results = _map(challengeResults, challenge => (
        <ChallengeResultItem
          key={challenge.id}
          {...this.props}
          className="mr-mb-4"
          challenge={challenge}
        />
      ))
    }

    return (
      <div className="mr-mb-6 lg:mr-mb-0 lg:mr-rounded lg:mr-h-content mr-pr-4 mr--mr-4 lg:mr-overflow-auto lg:mr-col-span-4">
        {virtualChallengeOption}
        {results}

        <div className="after-results">
          <PageResultsButton {...this.props} />
        </div>
      </div>
    )
  }
}

ChallengeResultList.propTypes = {
  /**
   * Candidate challenges to which any current filters, search, etc. should be
   * applied
   */
  unfilteredChallenges: PropTypes.array.isRequired,

  /** Remaining challenges after all filters, searches, etc. applied */
  challenges: PropTypes.array.isRequired,

  /** Remaining challenges after challenges have been paged */
  pagedChallenges: PropTypes.array.isRequired,
}

export default WithCurrentUser(
                 WithSortedChallenges(
                   WithPagedChallenges(ChallengeResultList, "challenges", "pagedChallenges")
                 )
               )
