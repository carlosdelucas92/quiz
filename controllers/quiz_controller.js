var Sequelize = require('sequelize');
var models = require('../models/models.js');

// MW que permite acciones solamente si el quiz objeto pertenece al usuario logeado o si es cuenta admin
exports.ownershipRequired = function(req, res, next){
    var objQuizOwner = req.quiz.UserId;
    var logUser = req.session.user.id;
    var isAdmin = req.session.user.isAdmin;

    if (isAdmin || objQuizOwner === logUser) {
        next();
    } else {
        res.redirect('/');
    }
};

// Autoload - :id
exports.load = function(req, res, next, quizId){
  models.Quiz.find({
            where: {
                id: Number(quizId)
            },
            include: [{
                model: models.Comment
            }]
        }).then(function(quiz) {
			if(quiz){
				req.quiz = quiz;
				next();
			} else{ next(new Error('No existe quizId='+ quizId))}
		}
		).catch(function(error){next(error)});
};

// GET /quizes
exports.index = function(req, res) {
	var buscar;
	if(req.query.search){
		buscar="%" +req.query.search +"%";
	}
	console.log(buscar);		
	if(buscar){
		models.Quiz.findAll({where: ["pregunta like ?", buscar]}).then(function(quizes) {	
			res.render('quizes/index.ejs', {quizes: quizes});
	})	
	} else {
		models.Quiz.findAll().then(function(quizes) {	
			res.render('quizes/index.ejs', {quizes: quizes, errors: []});
		}).catch(function(error){next(error)});
	}	
};


// GET /quizes/:id
exports.show = function(req, res) {
  res.render('quizes/show', { quiz: req.quiz, errors: []});
};

// GET /quizes/:id/answer
exports.answer = function(req, res) {
  var resultado = 'Incorrecto';
  if (req.query.respuesta === req.quiz.respuesta) {
    resultado = 'Correcto';
  }
  res.render('quizes/answer', {quiz: req.quiz, respuesta: resultado, errors: []});
};

// GET /quizes/new
exports.new = function(req, res){
  var quiz = models.Quiz.build(
    {pregunta: "Pregunta", respuesta: "Respuesta"}
  );

  res.render('quizes/new', {quiz: quiz, errors: []});
};	

// POST /quizes/create
exports.create = function(req, res){
  req.body.quiz.UserId = req.session.user.id;
  if(req.files.image){
    req.body.quiz.image = req.files.image.name;
  }
	var quiz = models.Quiz.build(req.body.quiz);
	quiz.validate().then(function(err){
      if (err) {
        res.render('quizes/new', {quiz: quiz, errors: err.errors});
      } else {
        quiz // save: guarda en DB campos pregunta y respuesta de quiz
        .save({fields: ["pregunta", "respuesta", "UserId", "image"]})
        .then( function(){ res.redirect('/quizes')}) 
      }      // res.redirect: Redirección HTTP a lista de preguntas
    }
  ).catch(function(error){next(error)});
};

// GET /quizes/:id/edit
exports.edit = function(req, res){
	var quiz = req.quiz // autoload de instancia de quit
	res.render('quizes/edit', {quiz: quiz, errors: []});
};

// PUT /quizes/:id
exports.update = function(req, res) {
  if(req.files.image){
    req.quiz.image = req.files.image.name;
  }
  req.quiz.pregunta  = req.body.quiz.pregunta;
  req.quiz.respuesta = req.body.quiz.respuesta;

  req.quiz
  .validate()
  .then(
    function(err){
      if (err) {
        res.render('quizes/edit', {quiz: req.quiz, errors: err.errors});
      } else {
        req.quiz     // save: guarda campos pregunta y respuesta en DB
        .save( {fields: ["pregunta", "respuesta", "image"]})
        .then( function(){ res.redirect('/quizes');});
      }     // Redirección HTTP a lista de preguntas (URL relativo)
    }
  ).catch(function(error){next(error)});
};

// DELETE /quizes/:id
exports.destroy = function(req, res) {
  req.quiz.destroy().then( function() {
    res.redirect('/quizes');
  }).catch(function(error){next(error)});
};

exports.statistics = function(req, res, next) {
  var statistics = {};
  models.Quiz.count()
  .then(function(count) {
    statistics.quiz_count = count;
    return models.Comment.count();
  })
  .then(function(count) {
    statistics.comment_count = count;
    return models.Comment
        .findAll({
          attributes: [ [ Sequelize.fn('count', Sequelize.fn('DISTINCT', Sequelize.col('QuizId'))), 'count' ] ],
          raw : true
        });
  })
  .then(function(result) {
    var count = result[0].count;
    var avg = statistics.comment_count / statistics.quiz_count;
    statistics.avg_comments_per_quiz = Math.round(avg * 100) / 100;
    statistics.quiz_count_w_comments = count;
    statistics.quiz_count_wo_comments = statistics.quiz_count - count;
    res.locals.statistics = statistics;
    res.render('quizes/statistics', {errors: []});
  })
};

