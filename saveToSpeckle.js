const uuidv4 = require('uuid/v4');
const CryptoJS = require("crypto-js");
const axios = require('axios');
const config = require('./public/config');

module.exports = function(response, cb) {
	var streamRequest = { objects: [], layers: [] };
	var objectRequest = [];
	var orderIndex = 0;
	var startIndex = 0;

	Object.keys(response).forEach((key) => {
		//create new layer
		let layer = { name: key, guid: uuidv4(), orderIndex: orderIndex, startIndex: startIndex, objectCount: response[key].length }
		streamRequest.layers.push(layer)
		response[key].forEach((item) => {
			if (item.primitive == "polyline") {
				if (item['attributes'] && item['attributes']['type']) {
					item['attributes']['osm_type'] = item['attributes']['type'];
					delete item['attributes']['type'];
				}
				let vals = [].concat.apply([], item.points)
				let obj = {
					//name: scene1._sceneObjectMap[key].name,
					type: item.primitive.charAt(0).toUpperCase() + item.primitive.slice(1),
					value: vals,
					properties: item['attributes'],
					geometryHash: item.primitive.charAt(0).toUpperCase() + item.primitive.slice(1) + "." + CryptoJS.enc.Base64.stringify(CryptoJS.MD5(vals.toString())),
					hash: CryptoJS.enc.Base64.stringify(CryptoJS.MD5(CryptoJS.enc.Base64.stringify(CryptoJS.MD5(vals.toString())) + CryptoJS.enc.Base64.stringify(CryptoJS.MD5(JSON.stringify(item['attributes']))))),
					applicationId: uuidv4()
				}
				objectRequest.push(obj)
			} else if (item.primitive == "mesh") {
				if (item['attributes'] && item['attributes']['type']) {
					item['attributes']['osm_type'] = item['attributes']['type'];
					delete item['attributes']['type'];
				}
				let vs = [].concat.apply([], item.vertices)
				let fs = [].concat.apply([], item.faces)
				let obj = {
					//name: scene1._sceneObjectMap[key].name,
					type: item.primitive.charAt(0).toUpperCase() + item.primitive.slice(1),
					vertices: vs,
					faces: fs,
					properties: item['attributes'],
					geometryHash: item.primitive.charAt(0).toUpperCase() + item.primitive.slice(1) + "." + CryptoJS.enc.Base64.stringify(CryptoJS.MD5(vals.toString())),
					hash: CryptoJS.enc.Base64.stringify(CryptoJS.MD5(CryptoJS.enc.Base64.stringify(CryptoJS.MD5(vals.toString())) + CryptoJS.enc.Base64.stringify(CryptoJS.MD5(JSON.stringify(item['attributes']))))),
					applicationId: uuidv4()
				}
				objectRequest.push(obj)

			}
			
		});
		orderIndex++;
		startIndex = objectRequest.length;
	});

	// POST object requests, get response and parse response object
	axios({
	  method: 'post',
	  url: config.speckleUrl + '/api/v1/objects',
	  headers: {'Authorization': config.tempJwt},
	  data: objectRequest
	}).then((objectCreationResponse) => {
		if (objectCreationResponse.data['success'] == true) {
			if (objectCreationResponse.data.resource) {
				streamRequest.objects = objectCreationResponse.data.resource;
			} else if (objectCreationResponse.data.resources) {
				streamRequest.objects = objectCreationResponse.data.resources; 
			}
			// POST stream request
			axios({
			  method: 'post',
			  url: config.speckleUrl + '/api/v1/streams',
			  headers: {'Authorization': config.tempJwt},
			  data: streamRequest
			}).then((streamCreationResponse) => {
				cb(false, streamCreationResponse.data.resource['streamId']);
			})
		} else {
			cb("Error pushing to Speckle");
		}
	});
}
	
