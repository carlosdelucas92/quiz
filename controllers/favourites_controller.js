var models = require('../models/models.js');

exports.show = function(req, res) {

  models.Favourites.findAll({ where: { UserId: Number(req.user.id)}})
	.then(function(favoritos) {
		var quiz_ids = [];
		for (i in favoritos) {
		  quiz_ids[i] = favoritos[i].QuizId;
		};
		models.Quiz.findAll({ where: { id: quiz_ids }})
		  .then(function(quizes) {
			res.render('favourites/show', {quizes: quizes, errors: []});
		  });
	}).catch(function(error) { next(error);});
};

exports.update = function(req, res, next) {

  req.user.addQuiz(req.quiz).then(function() {
	res.redirect('/quizes');
  }).catch(function(error){next(error)});
};

exports.destroy = function(req, res) {

  req.user.removeQuiz(req.quiz).then(function() {
	res.redirect('/quizes');
  }).catch(function(error){next(error)});
};