import React, { Component } from 'react';
import PropTypes from 'prop-types'
import _get from 'lodash/get'
import _sortBy from 'lodash/sortBy'
import _reverse from 'lodash/reverse'
import _isEmpty from 'lodash/isEmpty'
import _omit from 'lodash/omit'
import _toLower from 'lodash/toLower'
import { SORT_NAME, SORT_CREATED, SORT_OLDEST, SORT_SCORE} from '../../services/Search/Search';

export const sortUsers = function(props, usersProp='adminUsers') {
  const sortCriteria = _get(props, 'searchSort.sortBy')
  let sortedUsers = props[usersProp]
  if (sortCriteria === SORT_NAME) {
    sortedUsers = _sortBy(sortedUsers, (u) => _toLower(u.name))
  }
  else if (sortCriteria === SORT_CREATED) {
    sortedUsers = _reverse(_sortBy(sortedUsers,
      u => u.created ? u.created : ''))
  }
  else if (sortCriteria === SORT_OLDEST) {
    sortedUsers = (_sortBy(sortedUsers, 
      u => u.created ? u.created : ''))
  }
  else if (sortCriteria === SORT_SCORE) {
     sortedUsers = (_sortBy(sortedUsers, 
      u => u.score ? u.score : ''))
  }
  return sortedUsers
}

export default function(WrappedComponent,
                        usersProp='adminUsers',
                        outputProp) {
  class WithSortedUsers extends Component {
    render() {
      const sortedUsers = sortUsers(this.props, usersProp)

      if (_isEmpty(outputProp)) {
        outputProp = usersProp
      }

      return <WrappedComponent {...{[outputProp]: sortedUsers}}
                               {..._omit(this.props, outputProp)} />
    }
  }

  WithSortedUsers.propTypes = {
    adminUsers: PropTypes.object,
  }

  return WithSortedUsers
}
