const {
  compose, map, prop, path, slice, pick, forEach, concat, flip,
  contains, replace, filter, merge, useWith, identity
} = require('ramda')
const { slugify }  = require('mellotron')
const { readdir, writeFile } = require('fs');
const { get } = require('axios')

const biopics = require('./biopics.json')
const imagesPath = './images/'
const apiURL = 'https://www.googleapis.com/pagespeedonline/v1/runPagespeed?screenshot=true&strategy=mobile&url='
const addExt = flip(concat)
const replaceWWW = replace('www', 'm')
const toFilename = compose(addExt('.jpg'), replaceWWW, slugify, prop('site'))
const getScreenshot = site => get(`${apiURL}${encodeURIComponent(site)}`)
const logStatus = image => (err) => err ? console.error(err) : console.log(image)
const getPath = filename => `${imagesPath}${filename}`
const saveImage = (filename, contents) => writeFile(getPath(filename), contents, { encoding: 'base64' }, logStatus(filename));
const getSiteScreenshot = compose(getScreenshot, prop('site'))
const getSites = compose(map(getSiteScreenshot), slice(0, 20))
const getData = prop('data')
const getImage = compose(pick(['id', 'screenshot']), getData)
const saveFile = ({ id, screenshot }) => saveImage(`${slugify(id)}.jpg`, getData(screenshot))
const saveAll = compose(forEach(saveFile), map(getImage))
const reportError = compose(console.error, path(['response', 'data', 'error', 'message']))
const download = sites => Promise.all(sites).then(saveAll).catch(reportError)
const isDownloaded = useWith(contains, [toFilename, identity])
const markDownloaded = downloaded => map(biopic => merge(biopic, { downloaded: isDownloaded(biopic, downloaded) }))
const removeDownloaded = filter(({ downloaded }) => !downloaded)
const startDownload = downloaded => compose(download, getSites, removeDownloaded, markDownloaded(downloaded))
const findFiles = (err, downloaded) => startDownload(downloaded)(biopics)

readdir(imagesPath, findFiles)
