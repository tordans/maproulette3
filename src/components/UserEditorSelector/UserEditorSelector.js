import React, { Component } from 'react'
import { FormattedMessage } from 'react-intl'
import classNames from 'classnames'
import _map from 'lodash/map'
import _compact from 'lodash/compact'
import _get from 'lodash/get'
import { DEFAULT_EDITOR, Editor, keysByEditor, editorLabels }
       from '../../services/Editor/Editor'
import Dropdown from '../Dropdown/Dropdown'
import SvgSymbol from '../SvgSymbol/SvgSymbol'
import BusySpinner from '../BusySpinner/BusySpinner'
import messages from './Messages'

export default class UserEditorSelector extends Component {
  state = {
    isSaving: false,
  }

  currentEditor = () => {
    const configuredEditor =
      _get(this.props, 'user.settings.defaultEditor', Editor.none)
    return configuredEditor === Editor.none ? DEFAULT_EDITOR : configuredEditor
  }

  chooseEditor = editor => {
    const updatedSettings =
      Object.assign({}, this.props.user.settings, {defaultEditor: editor})

    this.setState({isSaving: true})
    this.props.updateUserSettings(this.props.user.id, updatedSettings).then(() =>
      this.setState({isSaving: false})
    )
  }

  editorItems = editorLabels => {
    return _compact(_map(editorLabels, (label, key) => {
      const editor = Editor[key]
      // Don't offer 'none' option
      if (editor === Editor.none) {
        return null
      }

      return (
        <li
          key={editor}
          className={classNames({
            "active": editor === this.props.user.settings.defaultEditor
          })}
        >
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a onClick={() => this.chooseEditor(editor)}>{label}</a>
        </li>
      )
    }))
  }

  render() {
    const localizedEditorLabels = editorLabels(this.props.intl)

    return (
      <div className="mr-text-xs mr-text-white mr-flex mr-pt-2 mr-whitespace-no-wrap">
        <span className="mr-mr-1">
          <FormattedMessage {...messages.currentlyUsing} />
        </span>
        {this.state.isSaving ? <BusySpinner /> :
         <Dropdown
           className="mr-dropdown"
           button={
             <EditorButton
               editorLabels={localizedEditorLabels}
               userEditor={this.currentEditor()}
             />
           }
         >
           <ol className="mr-list-dropdown">
             {this.editorItems(localizedEditorLabels)}
           </ol>
         </Dropdown>
        }
      </div>
    )
  }
}

const EditorButton = function(props) {
  return (
    <span className="mr-flex">
      <b className="mr-mr-1">{props.editorLabels[keysByEditor[props.userEditor]]}</b>
      <SvgSymbol
        sym="cog-icon"
        viewBox="0 0 15 15"
        className="mr-fill-green-lighter mr-w-3 mr-h-3"
      />
    </span>
  )
}
