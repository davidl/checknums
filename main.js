var angular = angular || {};
var numbersCheckerApp = angular.module('NumbersCheckerApp', ['ngMaterial', 'ngMessages'])

numbersCheckerApp.factory('winnumsService', function ($http) {
  var promise;
  // var url = '/winnums';
  var url = 'https://calculating-pocket.gomix.me/data';
  var winnumsService = {
    async: function() {
      if ( !promise ) {
        // $http returns a promise, which has a then function, which also returns a promise
        promise = $http.get(url).then(function (response) {
          // The then function here is an opportunity to modify the response
          // The return value gets picked up by the then in the controller.
          return response.data;
        });
      }
      // Return the promise to the controller
      return promise;
    }
  };
  return winnumsService;
});

numbersCheckerApp.config(function($mdThemingProvider) {
  $mdThemingProvider.theme('default')
    .primaryPalette('blue-grey');
  $mdThemingProvider.theme('altTheme')
    .primaryPalette('deep-purple');
})
.controller('AppCtrl', function ($scope, $element, $mdToast, $mdDialog, winnumsService) {
  var ctrl = this;
  // $scope.resultContent = '00 00 00 00 00 00 X';

  ctrl.deletedTicket = null;
  ctrl.drawings = null;
  ctrl.selectedDrawing = null;
  ctrl.selectedDrawingDate = null;
  ctrl.draw = {
    multiplier: '',
    red: '',
    white: []
  };

  function baseDraw () {
    return {
      multiplier: '',
      red: '',
      white: []
    };
  }

  ctrl.cards = [];

  function baseCard () {
    return {
      jackpot: false,
      match: false,
      matchedR: false,
      matchedW: [],
      multiplier: false,
      red: '',
      score: null,
      white: []
    }
  }

  ctrl.addEditLabel = 'Add';

  ctrl.addCard = function () {
    ctrl.cards.push(baseCard());
    ctrl.addEditLabel = 'Add';
    ctrl.editCard(null, ctrl.cards.length - 1);
  };

  ctrl.getDrawings = function () {
    winnumsService.async().then(function (data) {
      ctrl.drawings = data;
      ctrl.selectedDrawing = ctrl.drawings[0];
      ctrl.selectedDrawingDate = ctrl.selectedDrawing.date;
      // Winning numbers:
      ctrl.draw.white = ctrl.selectedDrawing.white;
      ctrl.draw.red = ctrl.selectedDrawing.red;
      ctrl.draw.multiplier = ctrl.selectedDrawing.multiplier;
    }, function (error) {
      ctrl.selectedDrawingDate = 'custom';
    });
  };

  function initialize () {
    ctrl.getDrawings();
    ctrl.draw = baseDraw();
    ctrl.cards = [];
  }
  initialize();

  ctrl.drawingSelection = function () {
    if (ctrl.selectedDrawingDate === 'custom') {
      ctrl.draw = baseDraw();
    } else {
      // find the "selectedDrawing" using the "selectedDrawingDate":
      for (var i = 0; i < ctrl.drawings.length; i++) {
        if (ctrl.drawings[i].date === ctrl.selectedDrawingDate) {
          ctrl.draw = ctrl.drawings[i];
          break;
        }
      }
      ctrl.checkNums();
    }
  };


  ctrl.editCardIndex = null;

  ctrl.cardCopy = null;

  ctrl.wList = [];

  for (var i = 1; i < 70; i++) {
    ctrl.wList.push(i < 10 ? '0' + i : i.toString());
  }

  ctrl.rList = [];

  for (var i = 1; i < 27; i++) {
    ctrl.rList.push(i < 10 ? '0' + i : i.toString());
  }

  ctrl.disableOption = function (arr, val) {
    return arr.length === 5 && arr.indexOf(val) < 0;
  };

  ctrl.checkLength = function () {
    $scope.ticketForm.white.$setValidity('length', ctrl.cardCopy.white.length === 5);
  };

  ctrl.cardComplete = function (card) {
    return card && card.white.length === 5 && card.red !== '';
  };

  ctrl.editCard = function ($event, index) {
    // Store index of card to be edited:
    ctrl.editCardIndex = index;
    // Copy card being edited to allow cancellation:
    ctrl.cardCopy = angular.copy(ctrl.cards[index]);

    if ($event) {
      ctrl.addEditLabel = 'Edit';
    }

    $mdDialog.show({
          clickOutsideToClose: false,
          scope: $scope,
          // targetEvent: $event,
          openFrom: '#card-edit-' + index,
          closeTo: '#card-edit-' + index,
          preserveScope: true,
          parent: angular.element(document.body),
          fullscreen: true,
          template: '<md-dialog aria-label="{{::ctrl.addEditLabel}} Ticket">' +
'<md-toolbar>' +
  '<div class="md-toolbar-tools">' +
	  '<h2>{{::ctrl.addEditLabel}} Ticket</h2>' +
    '<span flex></span>' +
    '<md-button class="md-icon-button" ng-click="cancelDialog()">' +
      '<md-icon aria-label="Close dialog">' +
      '<svg fill="#FFFFFF" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' +
    '<path d="M0 0h24v24H0z" fill="none"/>' +
'</svg></md-icon>' +
    '</md-button>' +
  '</div>' +
'</md-toolbar>' +
'<md-dialog-content flex layout-padding>' +
  '<form name="ticketForm">'+
  '<div>Pick 5 white balls and 1 red Powerball:</div>' +
  '<div flex layout layout-align="start start" layout-wrap>' +
    '<md-input-container flex="none" class="num-set">' +
      '<label>White Balls</label>' +
      '<md-select ng-model="ctrl.cardCopy.white" name="white" ' +
        'placeholder="White Balls" ' +
        'md-on-close="ctrl.checkLength()"' +
        'md-container-class="num-set-container" ' +
        'multiple>' +
        '<md-select-header class="num-set-header" ng-class="{\'has-five\': ctrl.cardCopy.white.length === 5}">' +
          '{{ctrl.cardCopy.white.length ? ctrl.cardCopy.white.sort().join(\', \') : \'White (5)\'}}' +
        '</md-select-header>' +
        '<md-option ng-repeat="w in ctrl.wList" value="{{::w}}" ng-disabled="ctrl.cardCopy && ctrl.cardCopy.white && ctrl.disableOption(ctrl.cardCopy.white, \'{{::w}}\')">{{::w}}</md-option>' +
      '</md-select>' +
      '<div class="errors">Please pick {{5 - ctrl.cardCopy.white.length}} more</div>' +
    '</md-input-container>' +
    '<md-input-container flex="none" flex-offset="10" class="select-red">' +
      '<label>Red</label>' +
      '<md-select ng-model="ctrl.cardCopy.red" name="red" placeholder="Red" md-no-asterisk required>' +
        '<md-option ng-repeat="r in ctrl.rList" value="{{::r}}">{{::r}}</md-option>' +
      '</md-select>' +
      '<div class="errors">Required</div>' +
    '</md-input-container>' +
  '</div>' +
  '<div layout>' +
    '<md-switch class="md-primary use-multiplier" aria-label="PowerPlay" ng-model="ctrl.cardCopy.multiplier" flex="none"><span class="pp"><span>Power</span> Play</span></md-switch>' +
  '</div>' +
  '</form>' +
'</md-dialog-content>' +
'<md-dialog-actions layout="row" layout-align="space-between end">' +
  '<md-button ng-click="cancelDialog()">Cancel</md-button>' +
  '<md-button ng-click="closeDialog()" ng-disabled="!ctrl.cardComplete(ctrl.cardCopy)" class="md-primary md-raised">Apply</md-button>' +
'</md-dialog-actions>' +
            '</md-dialog>',
          parent: angular.element(document.body),
          controller: function DialogController($scope, $mdDialog) {
            $scope.closeDialog = function () {
              if (true) { // TODO: check for complete ticket
                ctrl.cards[ctrl.editCardIndex] = angular.copy(ctrl.cardCopy);
                ctrl.checkNums();
              }
              // console.log('card', ctrl.cards[ctrl.editCardIndex]);
              $mdDialog.hide();
            };
            $scope.cancelDialog = function () {
              $mdDialog.hide();
              if (ctrl.addEditLabel === 'Add') {
                ctrl.deleteCard(ctrl.cards.length - 1, true);
              }
              ctrl.cardCopy = null;
            };
          }
       });

  };

  ctrl.deletedCard = null;
  ctrl.deleteCard = function (i, noToast) {
    ctrl.deletedCard = ctrl.cards.splice(i, 1)[0];
    if (!noToast) {
      showDeleteCardToast(i);
    }
  };

  function showDeleteCardToast (i) {
    var toast = $mdToast.simple()
      .textContent('Ticket Deleted')
      .action('UNDO')
      .highlightAction(true)
      .position('top right')
      .hideDelay(0);

    $mdToast.show(toast).then(function(response) {
      if (response == 'ok') {
        ctrl.cards.splice(i, 0, ctrl.deletedCard);
        ctrl.deletedCard = null;
      }
    });
  }

  ctrl.deletedCardSet = null;
  ctrl.deleteAllTickets = function () {
    ctrl.deletedCardSet = angular.copy(ctrl.cards);
    ctrl.cards = [];
    var toast = $mdToast.simple()
      .textContent('All Tickets Deleted')
      .action('UNDO')
      .highlightAction(true)
      .position('top right')
      .hideDelay(0);
    $mdToast.show(toast).then(function(response) {
      if (response == 'ok') {
        ctrl.cards = angular.copy(ctrl.deletedCardSet);
        ctrl.deletedCardSet = null;
      }
    });
  };

  ctrl.showDisclaimerDialog = function(ev) {
    $mdDialog.show({
      // controller: DialogController,
      controller: function ($scope, $mdDialog) {},
      contentElement: '#disclaimerDialog',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true
    });
  };

  ctrl.showInstructionsDialog = function(ev) {
    $mdDialog.show({
      controller: function ($scope, $mdDialog) {},
      contentElement: '#instructionsDialog',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true
    });
  };

  ctrl.closeDialog = function (ev) {
    $mdDialog.hide();
  };

//   ctrl.scoreSummary = function (index) {
//     var tic = ctrl.cards[index];
//     var sum = [],
//         w = tic.matchedWhite.length || null;
//     if (w) sum.push(w + ' white');
//     if (tic.matchedRed) sum.push('Powerball');
//     if (tic.multiplier) sum.push(ctrl.draw.multiplier + 'x');
//     return sum.join(', ');
//   };

  /* TODO: add parameter to check a single card: */
  ctrl.checkNums = function () {
    var i,
        j;
    for (i = 0; i < ctrl.cards.length; i++) {
      var tic = ctrl.cards[i];

      // Reset some fields to accommodate multiple checks:
      tic.jackpot = false;
      tic.match = false;
      tic.matchedRed = false;
      tic.matchedWhite = [];
      tic.score = null;

      if (tic.red === ctrl.draw.red) {
        tic.match = true;
        tic.matchedRed = true;
      }
      for (j = 0; j < 5; j++) {
        if (ctrl.draw.white.indexOf(tic.white[j]) !== -1) {
          tic.match = true;
          tic.matchedWhite.push(tic.white[j]);
        }
      }

      tic.score = 0;
      if (tic.matchedRed || tic.matchedWhite.length) {
        switch (tic.matchedWhite.length) {
            case 0:
            tic.score = 4;
            break;
          case 1:
            if (tic.matchedRed) {
              tic.score = 4;
            }
            break;
          case 2:
            if (tic.matchedRed) {
              tic.score = 7;
            }
            break;
          case 3:
            tic.score = 7;
            if (tic.matchedRed) {
              tic.score = 100;
            }
            break;
          case 4:
            tic.score = 100;
            if (tic.matchedRed) {
              tic.score = 50000;
            }
            break;
          case 5:
            if (tic.matchedRed) {
              tic.jackpot = true;
            } else {
              tic.score = 1000000;
            }
        }
        if (tic.multiplier && !tic.jackpot) {
          // Multiplier is capped at 2X for 5+0 match:
          var multiplier = tic.matchedWhite.length === 5 ? 2 : ctrl.draw.multiplier;
          tic.score = multiplier * tic.score;
        }
      }
    }
  };



});
