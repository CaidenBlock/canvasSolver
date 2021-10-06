// ==UserScript==
// @name         Canvas Solver
// @namespace    https://caidenblock.com/
// @version      0.2.1
// @description  Attempts to automatically solve canvas assignments (basic version).
// @author       You
// @match        https://*.instructure.com/courses/*/quizzes/*/take*
// @icon         https://www.google.com/s2/favicons?domain=canvas.instructure.com
// @grant        GM.xmlHttpRequest
// @grant        GM.addElement
// @grant        GM.addStyle
// @connect      api.wolframalpha.com
// ==/UserScript==

(function(){
	'use strict'

	window.onload = inject()
	const brandColor = getComputedStyle(document.querySelector(':root')).getPropertyValue('--ic-brand-primary');
  const wolframKey = //put key here
	function inject() {
		GM.addElement(document.querySelector("#right-side > div"), 'button', {
			class: "btn btn-secondary",
			'data-action': "none",
			textContent: 'Solve Quiz',
			solverID: 'button1'
		});
		GM.addElement(document.querySelector("#right-side > div"), 'button', {
			class: "btn btn-secondary",
			'data-action': "none",
			textContent: 'Solver Options',
			solverID: 'button2'
		});
		document.querySelector("button[solverID='button1']").addEventListener("click", runSolver);
		document.querySelector("button[solverID='button2']").addEventListener("click", showOptions);
		GM.addStyle("\
    .solver_markQuestion {\
	    background: url(/dist/images/answers_sprite-0d764f2477.png) -48px top;\
	    cursor: pointer;\
	    position: absolute;\
	    left: -30px;\
	    margin-top: 40px;\
       top: 0px;\
	    height: 16px;\
	    width: 20px;\
        }\
		.solver_markQuestionWrong {\
				background-position:-48px -17px;\
		 		filter: hue-rotate(300deg);\
			}\
		.solver_markQuestionUnknown {\
				background-position:-48px -17px;\
		 		filter: hue-rotate(15deg) brightness(180%) ;\
			}\
		.solver_markQuestionCorrect {\
				background-position:-48px -17px;\
		 		filter: hue-rotate(70deg);\
			}\
    ");
		document.querySelectorAll('.question').forEach(addFlag)
	}

	function addFlag(item, index) {
		GM.addElement(item, 'a', {
			class: "solver_markQuestion",
			solverID: 'flag'+index,
			role: "checkbox",
		});
	}

	function showOptions() {
	}

	async function runSolver() {
		console.log("Solving")
		const questions = await document.querySelectorAll(".question")
		for await (let question of questions) {
			processQuestion(question)
		}
	}

	async function processQuestion(question) {
            //Tell wolfram to solve question if it seems real hard.
		var questionText = question.querySelector(".question_text > p").innerHTML;
		let wolframResponse = await wolframSolve(questionText)
		//var wolframResponse = "14"
		var correctAnswer
		var chosenAnswer
            //Figure out which type of answer canvas is expecting
		var answerParent = question.querySelector(".answers > *")


		switch(answerParent.toString()) {
                //Multiple choice or true/false
			case "[object HTMLFieldSetElement]":
				var answer = answerParent.querySelectorAll(".answer > .answer_row")
				var j
				for (j = 0; j < answer.length; j++) {
					var answerLabel = answer[j].querySelector(".answer_label").innerHTML.replace(/\s+/g, ' ').trim();
					if (answer[j].querySelector(".answer_input > input").checked === true)
					{
						chosenAnswer = [j]
					}
					if (wolframResponse === answerLabel) {
						correctAnswer = [j]
						answer[j].querySelector(".answer_input > input").style.boxShadow = "0px 0px 5px 3px "+ brandColor;
					}
				}
				if ((!chosenAnswer) && (correctAnswer)) {
					answer[correctAnswer].querySelector(".answer_input > input").checked = true;
				}
				break;
                //Probably an input field. Or everything has broken
			case "[object HTMLDivElement]":
				var input = answerParent.querySelector('.question_input[type="text"]')
				correctAnswer = wolframResponse
				input.placeholder="WRC: "+ wolframResponse
				if (input.value && input.value !== wolframResponse) {
					chosenAnswer = "caidenBlock"
				}
				else {
					chosenAnswer = correctAnswer;
					input.value = correctAnswer;
				}
				break;
			default:
				console.warn("Unknown Type")
		}
		console.log(chosenAnswer+" "+correctAnswer)
		//if wolfram did not give an answer, or there does not seem to be a correct answer
		if (!correctAnswer || !wolframResponse) {
			question.querySelector(".solver_markQuestion").classList.add("solver_markQuestionUnknown");
		}
		//if you gave the wrong answer
		else if (chosenAnswer.toString() !== correctAnswer.toString()) {
			question.querySelector(".solver_markQuestion").classList.add("solver_markQuestionWrong");
		}
		// if you did not choose an answer, or you selected the correct answer
		else if ((!chosenAnswer) || (chosenAnswer.toString() === correctAnswer.toString())) {
			question.querySelector(".solver_markQuestion").classList.add("solver_markQuestionCorrect");
		}
	}
	function wolframSolve(input) {
		return new Promise((resolve,reject)=>{
			GM.xmlHttpRequest({
				method: "POST",
				url: "https://api.wolframalpha.com/v2/query",
				data: "appid="+wolframKey+"&input="+encodeURIComponent(input)+"&reinterpret=true&includepodid=Result&format=plaintext&output=json",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				onload: function(response) {
					var responseParsed = JSON.parse(response.responseText)
					var end = responseParsed.queryresult.pods[0].subpods[0].plaintext.toString();
					resolve(end);
					reject(end);
				}
			})
		})
	}
}())
