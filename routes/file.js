var express = require('express');
var path = require('path');
var fs = require('fs');
var proc = require('child_process');

module.exports = function (fsPath) {
	var router = express.Router();

	function isImage(n) {
		var ext = path.extname(n.toLowerCase());
		switch (ext) {
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
		list.forEach(function (e) {
			if (isImage(e)) {
				imgs.push(e);
			}
		});
		return imgs;
	}


	router.get('*', function (req, res, next) {
		var fileRoot = fsPath;
		var httpPath = req.baseUrl + req.path;
		var httpParentPath = path.join(httpPath, '..');
		var p = decodeURI(path.join(fileRoot, req.path));
		fs.stat(p, function (err, stat) {
			if (err || !stat) {
				next();
				return;
			}
			if (stat.isFile()) {
				if (req.query && req.query.action === 'delete') {
					fs.unlink(p, function (err) {
						if (err) {
							next(err);
							return;
						}
						if (req.query.nexturl) {
							res.redirect(encodeURI(req.query.nexturl));
							return;
						}
						res.redirect(httpParentPath);
					});
				}
				else if (req.query && req.query.action === 'review' && isImage(p)) {
					var scope = {};
					scope.title = decodeURI(req.path);
					scope.path = httpPath;
					scope.parent = httpParentPath;
					fs.readdir(path.join(p, '..'), function (err, files) {
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
				proc.exec('rm -rf ' + p, function (err) {
					if (err) {
						next(err);
						return;
					}
					res.redirect(httpParentPath);
				});
				return;
			}
			fs.readdir(p, function (err, files) {
				if (err || !files) {
					next();
					return;
				}
				var scope = {};
				scope.title = decodeURI(req.path);
				scope.files = [];
				if (req.path !== '/') {
					scope.files.push({
						name: '返回上一级',
						path: httpParentPath,
						isBackParent: true
					});
				}
				files.forEach(function (e) {
					scope.files.push({
						name: e,
						path: path.join(httpPath, e) + (isImage(e) ?  '?action=review' : '')
					});
				});
				res.render('folder', scope);
			});
		});
		//res.render('index', { title: 'Express' });
	});

	router.use(express.static(fsPath))

	return router;
}
