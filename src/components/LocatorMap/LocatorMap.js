import React, { Component } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { ZoomControl } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { point, featureCollection } from '@turf/helpers'
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import _get from 'lodash/get'
import _isObject from 'lodash/isObject'
import _each from 'lodash/each'
import _map from 'lodash/map'
import { latLng } from 'leaflet'
import { TaskStatus } from '../../services/Task/TaskStatus/TaskStatus'
import { ChallengeLocation }
       from '../../services/Challenge/ChallengeLocation/ChallengeLocation'
import EnhancedMap from '../EnhancedMap/EnhancedMap'
import SourcedTileLayer from '../EnhancedMap/SourcedTileLayer/SourcedTileLayer'
import LayerToggle from '../EnhancedMap/LayerToggle/LayerToggle'
import WithChallengeFilters from '../HOCs/WithChallengeFilters/WithChallengeFilters'
import WithVisibleLayer from '../HOCs/WithVisibleLayer/WithVisibleLayer'
import WithMapBounds from '../HOCs/WithMapBounds/WithMapBounds'
import BusySpinner from '../BusySpinner/BusySpinner'

// Setup child components with necessary HOCs
const VisibleTileLayer = WithVisibleLayer(SourcedTileLayer)

/**
 * LocatorMap presents a specially configured EnhancedMap that can be used to
 * search for challenges geographically (i.e., challenges with tasks within the
 * map bounds). It also can be used to visually represent geographic boundaries
 * while deciding on a challenge, such as when the user applies the "Near Me"
 * challenge filter.
 *
 * Initial map bounds can be provided, and the LocatorMap will also update the
 * current bounds in the redux store as the map is moved so that other components
 * (like challenge results) can apply the bounds appropriately.
 *
 * > Note: because this map both updates bounds and accepts bounds, it must be
 * > careful to avoid an infinite loop. To do this, it treats the accepted
 * > mapBounds as initial bounds and only honors new bounds if they have the
 * > fromUserAction flag set to true. This component never sets that flag when
 * > dispatching new map bounds.
 *
 * @see See EnhancedMap
 *
 * @author [Neil Rotstan](https://github.com/nrotstan)
 */
export class LocatorMap extends Component {
  currentBounds = null

  shouldComponentUpdate(nextProps, nextState) {
    // We want to be careful about not constantly re-rendering, so we only
    // re-render if something meaningful changes:

    // the layer has been changed, or
    if (nextProps.layerSourceName !== this.props.layerSourceName) {
      return true
    }

    // the browsed challenge has changed, or
    if (nextProps.browsedChallenge !== this.props.browsedChallenge) {
      return true
    }

    // the loading status of clustered tasks change, or
    if (nextProps.loadingClusteredTasks !== this.props.loadingClusteredTasks) {
      return true
    }

    // it's the first time we've been given specific map bounds, or
    if (this.props.mapBounds.locator === null && nextProps.mapBounds.locator !== null) {
      return true
    }

    // a change in map bounds was initiated by a user action, as opposed
    // to simply navigating around in the map.
    if (_get(nextProps, 'mapBounds.locator.fromUserAction')) {
      return true
    }

    return false
  }

  /**
   * Signal a change to the current locator map bounds in response to a change
   * to the map (panning or zooming). If searching within map bounds is also
   * active, then signal that the map-bounded challenges also need to be
   * refreshed.
   *
   * @private
   */
  updateBounds = (bounds, zoom, fromUserAction=false) => {
    // If the new bounds are the same as the old, do nothing.
    if (this.currentBounds && this.currentBounds.equals(bounds)) {
      return
    }

    this.currentBounds = bounds

    // Update either the challenge bounds, if we're actively browsing a
    // challenge, or the locator bounds if not.
    if (_isObject(this.props.browsedChallenge)) {
      this.props.setChallengeMapBounds(this.props.browsedChallenge.id,
                                       bounds, zoom)
    }
    else {
      this.props.setLocatorMapBounds(bounds, zoom, fromUserAction)

      if (_get(this.props, 'challengeFilter.location') ===
          ChallengeLocation.withinMapBounds) {
        this.props.updateBoundedChallenges(bounds)
      }
    }
  }

  markerClicked = marker => {
    this.props.history.push(
      `/challenge/${marker.options.challengeId}/task/${marker.options.taskId}`)
  }

  render() {
    const isBrowsingChallenge = _isObject(this.props.browsedChallenge)
    const isLoadingData = isBrowsingChallenge && this.props.loadingClusteredTasks

    const markers = []
    let bounding = null
    if (isBrowsingChallenge) {
      // Build the clustered task markers if we have clustered tasks
      if (_get(this.props, 'clusteredTasks.length') > 0) {
        _each(this.props.clusteredTasks, task => {
          // Only show created or skipped tasks
          if (task.status === TaskStatus.created ||
              task.status === TaskStatus.skipped) {
            markers.push({
              position: [task.point.lat, task.point.lng],
              options: {
                challengeId: task.parent,
                taskId: task.id,
              },
            })
          }
        })
      }

      // Get the challenge bounding so we know which part of the map to display.
      // Right now API double-nests bounding, but that will likely change.
      bounding = _get(this.props, 'browsedChallenge.bounding.bounding') ||
                 _get(this.props, 'browsedChallenge.bounding')


      // If the challenge doesn't have a bounding polygon, build one from the
      // markers instead. This is extra work and requires waiting for the clustered
      // task data to arrive, so not ideal.
      if (!bounding && markers.length > 0) {
        bounding = bboxPolygon(
          bbox(featureCollection(
            _map(markers, marker => point([marker.position[1], marker.position[0]]))
          ))
        )
      }
    }

    return (
      <div key={_get(this.props, 'browsedChallenge.id') || 'locator'}
           className={classNames('full-screen-map', this.props.className)}>
        <LayerToggle {...this.props} />
        <EnhancedMap center={latLng(0, 45)} zoom={3} minZoom={2} maxZoom={18}
                     setInitialBounds={false}
                     initialBounds = {(this.props.browsedChallenge && this.currentBounds) ||
                                      _get(this.props, 'mapBounds.locator.bounds')}
                     zoomControl={false} animate={true}
                     features={bounding}
                     justFitFeatures={markers.length > 0}
                     onBoundsChange={this.updateBounds}>
          <ZoomControl position='topright' />
          <VisibleTileLayer defaultLayer={this.props.layerSourceName} />
          {markers.length > 0 &&
           <MarkerClusterGroup markers={markers} onMarkerClick={this.markerClicked} />
          }
        </EnhancedMap>

        {isLoadingData && <BusySpinner />}
      </div>
    )
  }
}

LocatorMap.propTypes = {
  /**
   * Initial bounds at which to render the map. To avoid an infinite loop, this
   * will only be honored once, unless the fromUserAction flag is set to true
   * on updated mapBounds values.
   */
  mapBounds: PropTypes.object,
  /** The current challenge being browsed, if any */
  browsedChallenge: PropTypes.object,
  /** Invoked when the user moves the locator map */
  setLocatorMapBounds: PropTypes.func.isRequired,
  /** Invoked when the user moves the map while browsing a challenge */
  setChallengeMapBounds: PropTypes.func.isRequired,
  /** Name of default layer to display */
  layerSourceName: PropTypes.string,
  /** The currently enabled challenge filter, if any */
  challengeFilter: PropTypes.object,
}

export default WithChallengeFilters(WithMapBounds(LocatorMap))
