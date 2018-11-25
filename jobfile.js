const krawler = require('@kalisio/krawler')
const hooks = krawler.hooks
const path = require('path')
const fs = require('fs')
const makeDebug = require('debug')
const _ = require('lodash')

const config = require('./seed.json')

const debug = makeDebug('krawler:examples')


// Create a custom hook to generate tasks
let generateTasks = () => {
  return (hook) => {
    let tasks = []
    
    const width = 360 / config.grid.width
    const height = 180 / config.grid.height

    for (let i = 0; i < config.grid.width; i++) {
      for (let j = 0; j < config.grid.height; j++) {
        const minx = -180 + (i * width)
        const miny = -90 + (j * height)
        let task = {
          id: i + '-' + j,
          seed: {
            layer: config.layer,
            levelMin: config.levels.min,
            levelMax: config.levels.max,
            bbox: [minx, miny, minx + width, miny + height],
          },
          type: 'noop'
        }
        tasks.push(task)
      }
    }
    debug('Generated download tasks', tasks)
    hook.data.tasks = tasks
    return hook
  }
}
hooks.registerHook('generateTasks', generateTasks)

module.exports = {
  id: 'seeder',
  store: 'output-store',
  options: {
    workersLimit: 4
  },
  hooks: {
    tasks: {
      before: {
      },
      after: {
        generateSeedFile: {
          hook: 'writeTemplate',
          dataPath: 'result',
          templateStore: 'template-store',
          templateFile: 'seed.yaml'
        },
        createDockerContainer: {
          Image: process.env.MAPPROXY_IMAGE + ':' + process.env.MAPPROXY_TAG,
          Cmd: ['mapproxy-seed', '-f', '/mapproxy/mapproxy.yaml', '-s', '/mapproxy/<%= id %>.yaml'],
          HostConfig: {
            Binds: [ process.env.SEEDER_MAPPROXY_CONFIG_PATH + ':/mapproxy' ]
          },
          NetworkingConfig: {
            EndpointsConfig: {
              "kargo": {}
            }
          },
          Env: [ 'AWS_ACCESS_KEY_ID=' + process.env.S3_ACCESS_KEY, 
                 'AWS_SECRET_ACCESS_KEY=' + process.env.S3_SECRET_ACCESS_KEY ]
        },
        startSeeder: {
          hook: 'runDockerContainerCommand',
          command: 'start'
        },
        waitSeeder: {
          hook: 'runDockerContainerCommand',
          command: 'wait'
        },
        removeSeeder: {
          hook: 'runDockerContainerCommand',
          command: 'remove',
          arguments: { force: true }
        }
      }
    },
    jobs: {
      before: {
        createStores: [
          {
            id: 'output-store',
            type: 'fs',
            storePath: 'output-store',
            options: { path: path.join(__dirname, '/mapproxy') }
          },
          {
            id: 'template-store',
            type: 'fs',
            storePath: 'template-store',
            options: { path: __dirname }
          }
        ],
        connectDocker: {
          host: process.env.DOCKER_HOST_IP,
          port: process.env.DOCKER_HOST_PORT || 2376,
          ca: fs.readFileSync('/certs/ca.pem'),
          cert: fs.readFileSync('/certs/cert.pem'),
          key: fs.readFileSync('/certs/pkey.pem'),
          clientPath: 'taskTemplate.client'
        },
        pullDockerImage: {
          clientPath: 'taskTemplate.client',
          image: process.env.MAPPROXY_IMAGE + ':' + process.env.MAPPROXY_TAG
        },
        generateTasks: {}
      },
      after: {
        disconnectDocker: {
          clientPath: 'taskTemplate.client'
        },
        removeStores: ['output-store', 'template-store']
      }
    }
  }
}
