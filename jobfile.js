const krawler = require('@kalisio/krawler')
const hooks = krawler.hooks
const path = require('path')
const fs = require('fs')
const makeDebug = require('debug')
const _ = require('lodash')

const config = require('/config/config.json')

const debug = makeDebug('krawler:seeder')


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
        createDockerService: {
          TaskTemplate: {
            Name: 'seeder-task-<%= id %>',
            ContainerSpec: {
              Image: 'kalisio/k-seeder:mapproxy-seed-latest',
              Env: [
                'AWS_ACCESS_KEY_ID=' + process.env.AWS_ACCESS_KEY_ID,
                'AWS_SECRET_ACCESS_KEY=' + process.env.AWS_SECRET_ACCESS_KEY
              ],
              Mounts: [
                {
                  type: 'bind',
                  Source: path.join(process.env.MAPPROXY_CONFIG_PATH, 'mapproxy.yaml'),
                  Target: '/mapproxy/mapproxy.yaml'
                },
                {
                  type: 'bind',
                  Source: path.join(process.env.SEEDER_CONFIG_PATH, 'seeds', '<%= id %>.yaml'),
                  Target: '/mapproxy/seed.yaml'
                },
                {
                    type: 'bind',
                    Source: process.env.MAPPROXY_DATA_PATH,
                    Target: '/mnt/data'
                  },
                  {
                    type: 'bind',
                    Source: process.env.MAPPROXY_CACHE_PATH,
                    Target: '/mnt/cache'
                  }
              ]
            },
            Placement: {
              Constraints: [
                'node.role == worker',
                'node.labels.mapproxy == true'
              ]
            },
            RestartPolicy: {
              Condition: 'none'
            }
          },
          Networks: [ {
            Target: process.env.DOCKER_NETWORK
          }]
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
            options: { path: '/config/seeds' }
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
          key: fs.readFileSync('/certs/key.pem'),
          clientPath: 'taskTemplate.client'
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
