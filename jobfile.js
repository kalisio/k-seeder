const krawler = require('@kalisio/krawler')
const hooks = krawler.hooks
const path = require('path')
const fs = require('fs')
const makeDebug = require('debug')
const _ = require('lodash')

const config = require('./config.json')

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
            ContainerSpec: {
              Image: 'kalisio/k-seeder:mapproxy-seed-latest',
              Env: [
                'AWS_ACCESS_KEY_ID=' + process.env.S3_ACCESS_KEY,
                'AWS_SECRET_ACCESS_KEY=' + process.env.S3_SECRET_ACCESS_KEY
              ],
              Mounts: [
                {
                  type: 'bind',
                  Source: '/home/ubuntu/kargo/.kargo/configs/mapproxy/mapproxy.yaml',
                  Target: '/mapproxy/mapproxy.yaml'
                },
                {
                  type: 'bind',
                  Source: '/home/ubuntu/kargo/.kargo/configs/seeder/seeds/<%= id %>.yaml',
                  Target: '/mapproxy/seed.yaml'
                },
                {
                    type: 'bind',
                    Source: '/mnt/data0/mapproxy_data',
                    Target: '/mnt/data'
                  },
                  {
                    type: 'bind',
                    Source: '/mnt/data0/mapproxy_cache',
                    Target: '/mnt/cache'
                  }
              ]
            },
            Placement: {
              Constraints: [
                'node.role == worker',
                'node.labels.mapproxy == true'
              ]
            }
          }
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
            options: { path: '/home/ubuntu/kargo/.kargo/configs/seeder/seeds' }
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
