var express = require('express');
var path = require('path');
var fs = require('fs');
var router = express.Router();
var proc = require('child_process');

var fileRootPath = path.join(__dirname, '../public');
var thunderRootPath = '/root'; ///root/thunder

function isImage(n) {
	var ext = path.extname(n.toLowerCase());
	switch(ext) {
		case '.png':
		case '.jpg':
		case '.gif':
		case '.jpeg':
		case '.bmp':
			return true;
	}
	return false;
}

function getImageList(list) {
	var imgs = [];
	list.forEach(function(e) {
		if (isImage(e)) {
			imgs.push(e);
		}
	});
	return imgs;
}


router.get('*', function(req, res, next) {
	if (req.path === '/') {
		next();
		return;
	}
	var fileRoot = fileRootPath;
	if (req.path.indexOf('/thunder') == 0) {
		fileRoot = thunderRootPath;
	}
	var p = decodeURI(path.join(fileRoot, req.path));
	fs.stat(p, function(err, stat){
		debugger;
		if (err || !stat) {
			next();
			return;
		}
		if (stat.isFile()) {
			if (req.query && req.query.action === 'delete') {
				fs.unlink(p, function(err){
					if (err) {
						next(err);
						return;
					}
					if (req.query.nexturl) {
						res.redirect(encodeURI(req.query.nexturl));
						return;
					}
					res.redirect(path.dirname(req.url));
				});
			}
			else if (req.query && req.query.action === 'review' && isImage(p)) {
				var scope = {};
				scope.title = decodeURI(req.path);
				scope.path = req.path;
				scope.parent = path.join(scope.title, '..');
				fs.readdir(path.join(p, '..'), function(err, files) {
					scope.next = scope.parent;
					scope.last = scope.parent;
					if (!err && files) {
						var imgs = getImageList(files);
						var index = imgs.indexOf(path.basename(p));
						if (index >= 0) {
							if (index > 0) {
								scope.last = path.join(scope.parent, imgs[index - 1]) + '?action=review';
							}
							if (index < imgs.length - 1) {
								scope.next = path.join(scope.parent, imgs[index + 1]) + '?action=review';
							}
						}
					}
					res.render('review', scope);
				});
			}
			else {
				next();
			}
			return;
		}
		else if (!stat.isDirectory()) {
			next();
			return;
		}
		if (req.query && req.query.action === 'delete') {
			proc.exec('rm -rf ' + p, function(err){
				if (err) {
					next(err);
					return;
				}
				res.redirect(path.dirname(req.url));
			});
			return;
		}
		fs.readdir(p, function(err, files){
			if (err || !files) {
				next();
				return;
			}
			var scope = {};
			scope.title = decodeURI(req.path);
			scope.files = [];
			scope.files.push({
				name: '返回上一级',
				path: path.join(req.url, '..')
			});
			files.forEach(function(e){
				scope.files.push({
					name: e,
					path: isImage(e) ? path.join(req.path, e) + '?action=review' : path.join(req.path, e)
				});
			});
			res.render('folder', scope);
		});
	});
	//res.render('index', { title: 'Express' });
});

module.exports = router;
