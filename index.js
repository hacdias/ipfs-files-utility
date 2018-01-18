const join = require('path').join
const bl = require('bl')

function collect (stream) {
  return new Promise((resolve, reject) => {
    stream.pipe(bl((err, buf) => {
      if (err) return reject(err)
      resolve(buf)
    }))
  })
}

function sort (a, b) {
  if (a.Type === 'directory' && b.Type !== 'directory') {
    return -1
  }

  if (b.Type === 'directory' && a.Type !== 'directory') {
    return 1
  }

  return a.Name > b.Name
}

module.exports = class FileManager {
  constructor (api) {
    this.api = api
  }

  list (root) {
    return this.api.files.ls(root)
      .then((res) => {
        const files = res.Entries || []

        return Promise.all(files.map((file) => {
          return this.api.files.stat([root, file.Name].join('/'))
            .then((stats) => {
              return Object.assign({}, file, stats)
            })
        })).then((res) => res.sort(sort))
      })
  }

  makeDirectory (name) {
    return this.api.files.mkdir(name)
  }

  removeDirectory (name) {
    return this.api.files.rm(name, {recursive: true})
  }

  move (from, to) {
    return this.api.files.mv([from, to])
  }

  createFiles (root, files) {
    // root is the directory we want to store the files in
    return Promise.all(files.map((file) => {
      const target = join(root, file.name)
      return this.api.files.write(target, file.content, {create: true})
    }))
  }

  stat (name) {
    return this.api.files.stat(name)
  }

  read (name) {
    return this.api.files.read(name).then(collect)
  }
}
