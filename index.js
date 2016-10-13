#!/usr/bin/env node
'use strict'

const got = require('got')
const inquirer = require('inquirer')
const API_URL = 'https://slack.com/api'

/**
 * @param {String} token
 * @param {String} channelName
 * @param {Boolean} onlyOldFiles
 */
function accessFiles (token, channelName, onlyOldFiles) {
  const thirtyDaysAgo = Math.floor(new Date().getTime() / 1000) - 30 * 86400;
  if (channelName) {
    let channel = getChannelInfo(function (channel) {
      if (channel) {
        listAndDeleteFiles(channel.id);
      } else {
        console.error('No channel info found. Aborting...');
      }
    });
  } else {
    console.log('No channel info in input. Deleting files for all channels')
    listAndDeleteFiles(null);
  }

  /**
   * @param {String} channelId
   */
  function listAndDeleteFiles (channelId) {
    got(`${API_URL}/files.list`, {
      body: {
        token: token,
        channel: channelId,
        ts_to: onlyOldFiles ? thirtyDaysAgo : 0,
        count: 1000
      },
      json: true
    })
      .then(response => deleteFiles(response.body.files))
      .catch(error => console.error('Error while getting files.', error))
  }

  /**
   * @param {function} callback
   */
  function getChannelInfo (callback) {
    got(`${API_URL}/channels.list`, {
      body: {
        token: token
      },
      json: true
    }).then(
      response => {
        let channel = response.body.channels.find(channel => channel.name === channelName)
        if (!channel) {
          console.error(`Channel ${channelName} not found.`);
          return callback(null)
        } else {
          console.info(`Found id ${channel.id} for channel ${channelName}`);
          return callback(channel)
        }
      }
    ).catch(error => console.error('Error while getting channel info.', error))
  }

  function deleteFiles (files) {
    if(!files) {
      console.error('Error while getting files.')
      return
    }
    if (!files.length) {
      console.info('There are no files to be deleted.')
      return
    }
    console.log(`Deleting ${files.length} files...`)
    files.map(file => deleteFile(file))
  }

  function deleteFile (file) {
    got(`${API_URL}/files.delete`, { body: { token: token, file: file.id } })
      .then(() => console.log(`${file.name} was deleted.`))
      .catch(error => console.error('Error while deleting files.', error))
  }
}

inquirer.prompt([{
  message: 'Enter your Slack token: ',
  name: 'token',
  type: 'input'
}, {
  message: 'Enter channel name (Leave blank to delete files for all channels): ',
  name: 'channelName',
  type: 'input',
  default: null
}, {
  message: 'Delete only files older than 30 days?',
  name: 'onlyOldFiles',
  type: 'confirm',
  default: false
}])
  .then(answers => accessFiles(answers.token, answers.channelName, answers.onlyOldFiles))
  .catch(error => console.error('Error while asking for input.', error))
