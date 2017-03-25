'use strict';

if ('serviceWorker' in navigator) {
  // If service workers are supported
  navigator.serviceWorker.register('/sw.js');
} else if ('applicationCache' in window) {
  // Otherwise inject an iframe to use appcache
  var iframe = document.createElement('iframe');
  iframe.setAttribute('src', '/appcache.html');
  iframe.setAttribute('style', 'border: 0; height: 0; width: 0');
  document.querySelector('body').appendChild(iframe);
}

var angular = angular || {};
var numbersCheckerApp = angular.module('NumbersCheckerApp', ['ngMaterial', 'ngMessages']);

numbersCheckerApp.factory('winnumsService', function ($http) {
  var promise;
  var url = 'https://rebel-yak.glitch.me/drawings';
  var winnumsService = {
    async: function () {
      if (!promise) {
        // $http returns a promise, which has a then function, which also returns a promise
        promise = $http.get(url).then(function (response) {
          // The then function here is an opportunity to modify the response
          // The return value gets picked up by the then in the controller.
          
          angular.forEach(response.data, function (value, key, obj) {
            var d = new Date(value.date),
                day = d.getDay(),
                prefix = '',
                prefixSet = false;
            if (key === 0) {
              var t = new Date(),
                  sameMonth = d.getMonth() === t.getMonth(),
                  sameDay = day === t.getDay(),
                  sameYear = d.getYear() === t.getYear();
              if (sameMonth && sameDay && sameYear) {
                prefix = 'Today ';
                prefixSet = true;
              }
            }
            if (!prefixSet) {
              prefix = day === 6 ? 'Sat ' : day === 3 ? 'Wed ' : '';
            }
            obj[key].date = prefix + value.date;
          });
          promise = null;
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
    .primaryPalette('indigo');
})
.controller('AppCtrl', function ($scope, $element, $mdToast, $mdDialog, $timeout, winnumsService) {
  var ctrl = this;
  ctrl.deletedTicket = null;
  ctrl.drawings = [];
  ctrl.selectedDrawing = null;
  ctrl.selectedDrawingDate = null;
  ctrl.draw = {
    multiplier: '',
    red: '',
    white: []
  };
  
  function storageAvailable(type) {
    try {
      var storage = window[type],
        x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    }
    catch(e) {
      return false;
    }
  }
  
  ctrl.hasLocalStorage = storageAvailable('localStorage');
  
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
      saved: false,
      savedKey: null,
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
  
  ctrl.gettingDrawings = false;

  ctrl.getDrawings = function () {
    ctrl.gettingDrawings = true;
    winnumsService.async().then(function (data) {
      // Check for first call or if the drawings are not updated:
      var drawingsUpdated = ctrl.drawings.length ? data[0].date !== ctrl.drawings[0].date : false;
      if (!ctrl.drawings.length || drawingsUpdated) {
        ctrl.drawings = data;
        ctrl.selectedDrawing = ctrl.drawings[0];
        ctrl.selectedDrawingDate = ctrl.selectedDrawing.date;
        // Winning numbers:
        ctrl.draw.white = ctrl.selectedDrawing.white;
        ctrl.draw.red = ctrl.selectedDrawing.red;
        ctrl.draw.multiplier = ctrl.selectedDrawing.multiplier;
        if (ctrl.cards.length) {
          ctrl.checkNums();
        }
        if (drawingsUpdated) {
          $mdToast.show(
            $mdToast.simple()
              .textContent('Results updated')
              .position('top right')
              .hideDelay(3000)
          );
        }
      } else {
        $mdToast.show(
          $mdToast.simple()
            .textContent('No new results')
            .position('top right')
            .hideDelay(3000)
        );
      }
      ctrl.gettingDrawings = false;
    }, function (error) {
      ctrl.selectedDrawingDate = 'custom';
      ctrl.gettingDrawings = false;
    });
  };

  function initialize () {
    ctrl.cards = [];
    ctrl.draw = baseDraw();
    if (ctrl.hasLocalStorage) {
      var len = localStorage.length;
      var key = '';
      var val = '';
      if (len) {
        for (var i = 0; i <= len - 1; i++) {
          key = localStorage.key(i);
          if (key.indexOf('cn-') === 0) {
            val = JSON.parse(localStorage.getItem(key));
            val.score = null;
            ctrl.cards.push(val);
          }
        }
      }
    }
    ctrl.getDrawings();
  }
  initialize();

  ctrl.drawingSelection = function () {
    if (ctrl.selectedDrawingDate === 'custom') {
      // ctrl.draw = baseDraw();
      ctrl.setCustomResults();
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
  
  ctrl.setCustomResults = function () {
    ctrl.addEditLabel = 'Edit';
    ctrl.draw.multiplier = '2';
    ctrl.showEditDialog(null);
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

  ctrl.checkLength = function (cardOrDraw) {
    $scope.ticketForm.white.$setValidity('length', ctrl[cardOrDraw].white.length === 5);
  };

  ctrl.cardComplete = function (card) {
    return card && card.white.length === 5 && card.red !== '';
  };
  
  ctrl.showEditDialog = function (index) {
    // a null index means we're editing a custom drawing:
    var isCard = index !== null;
    var cardOrDraw = isCard ? 'cardCopy' : 'draw';
    
    $mdDialog.show({
      clickOutsideToClose: false,
      scope: $scope,
      // targetEvent: $event,
      openFrom: isCard ? '#card-edit-' + index : '#btn-edit-results',
      closeTo: isCard ? '#card-edit-' + index : '#btn-edit-results',
      preserveScope: true,
      parent: angular.element(document.body),
      fullscreen: true,
      template: '<md-dialog aria-label="{{::ctrl.addEditLabel}} ' + (isCard ? 'Ticket' : 'Custom Results') + '">' +
          '<md-toolbar>' +
            '<div class="md-toolbar-tools">' +
                '<h2>{{::ctrl.addEditLabel}} ' + (isCard ? 'Ticket' : 'Custom Results') + '</h2>' +
              '<span flex></span>' +
              '<md-button class="md-icon-button" ng-click="cancelDialog()">' +
                '<md-icon aria-label="Close dialog">' +
                  '<svg fill="#FFFFFF" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' +
                    '<path d="M0 0h24v24H0z" fill="none"/>' +
                  '</svg>' + 
                '</md-icon>' +
              '</md-button>' +
            '</div>' +
          '</md-toolbar>' +
          '<md-dialog-content flex layout-padding>' +
            '<form name="ticketForm">'+
              '<div style="margin: 16px 0">Pick 5 white balls and 1 red Powerball:</div>' +
              '<div flex layout layout-align="start start" layout-wrap>' +
                '<md-input-container flex="none" class="num-set">' +
                  '<label>White Balls</label>' +
                  '<md-select ng-model="ctrl.' + cardOrDraw + '.white" name="white" ' +
                    'placeholder="White Balls" ' +
                    'md-on-close="ctrl.checkLength(\'' + cardOrDraw + '\')" ' +
                    'md-container-class="num-set-container" ' +
                    'multiple>' +
                    '<md-select-header class="num-set-header" ng-class="{\'has-five\': ctrl.' + cardOrDraw + '.white.length === 5}">' +
                      '{{ctrl.' + cardOrDraw + '.white.length ? ctrl.' + cardOrDraw + '.white.sort().join(\', \') : \'White (5)\'}}' +
                    '</md-select-header>' +
                    '<md-option ng-repeat="w in ctrl.wList" value="{{::w}}" ng-disabled="ctrl.' + cardOrDraw + ' && ctrl.' + cardOrDraw + 
                      '.white && ctrl.disableOption(ctrl.' + cardOrDraw + '.white, \'{{::w}}\')">{{::w}}</md-option>' +
                  '</md-select>' +
                  '<div class="errors">Please pick {{5 - ctrl.' + cardOrDraw + '.white.length}} more</div>' +
                '</md-input-container>' +
                '<md-input-container flex="none" flex-offset="10" class="select-red">' +
                  '<label>Red</label>' +
                  '<md-select ng-model="ctrl.' + cardOrDraw + '.red" name="red" placeholder="Red" md-no-asterisk required>' +
                    '<md-option ng-repeat="r in ctrl.rList" value="{{::r}}">{{::r}}</md-option>' +
                  '</md-select>' +
                  '<div class="errors">Required</div>' +
                '</md-input-container>' +
              '</div>' +
              '<div layout>' +
                (isCard ?
                  '<md-switch class="md-primary use-multiplier" aria-label="PowerPlay" ng-model="ctrl.cardCopy.multiplier" flex="none">' +
                     '<span class="pp"><span>Power</span> Play</span></md-switch>' :
                  '<md-input-container flex="none" class="pp-select">' +
                    '<label><span class="pp"><span>Power</span> Play</span></label>' +
                    '<md-select ng-model="ctrl.draw.multiplier" placeholder="Power Play">' +
                      '<md-option value="2">2x</md-option>' +
                      '<md-option value="3">3x</md-option>' +
                      '<md-option value="4">4x</md-option>' +
                      '<md-option value="5">5x</md-option>' +
                      '<md-option value="10">10x</md-option>' +
                    '</md-select>' +
                 '</md-input-container>'
                ) +
              '</div>' +
              '<div layout="row" layout-align="space-between end">' +
                '<div flex="50" flex-order="2"><md-button ng-click="closeDialog()" ng-disabled="!ctrl.cardComplete(ctrl.' + cardOrDraw +
                  ')" class="md-primary md-raised" style="width: 100%">' + (isCard ? 'Check Ticket' : 'Set Results') + '</md-button></div>' +
                '<md-button ng-click="cancelDialog()" class="btn-cancel">Cancel</md-button>' +
              '</div>' +
            '</form>' +
          '</md-dialog-content>' +
        '</md-dialog>',
      parent: angular.element(document.body),
      controller: function DialogController($scope, $mdDialog) {
        $scope.closeDialog = function () {
          if (isCard) {
            ctrl.cards[ctrl.editCardIndex] = angular.copy(ctrl.cardCopy);
            if (ctrl.hasLocalStorage) {
              ctrl.saveTicket(ctrl.cards[ctrl.editCardIndex]);
            }
          }
          ctrl.checkNums();
          $mdDialog.hide();
          ctrl.cardCopy = null;
        };
        $scope.cancelDialog = function () {
          $mdDialog.hide();
          if (isCard) {
            if (ctrl.addEditLabel === 'Add') {
              ctrl.deleteCard(null, ctrl.cards.length - 1, true);
            } else {
              ctrl.cards[ctrl.editCardIndex].isEdit = false;
            }
            ctrl.cardCopy = null;
          } else {
            ctrl.draw = baseDraw();
          }
        };
      }
   });
  };
  
  ctrl.editCard = function ($event, index) {
    // Store index of card to be edited:
    ctrl.editCardIndex = index;
    // Copy card being edited to allow cancellation:
    ctrl.cardCopy = angular.copy(ctrl.cards[index]);
    if ($event) {
      ctrl.addEditLabel = 'Edit';
      ctrl.cards[index].isEdit = true;
    }
    ctrl.showEditDialog(index);
  };

  ctrl.deletedCard = null;
  ctrl.deleteCard = function ($event, index, noToast) {
    ctrl.cards[index].deleting = true;
    if (!noToast) {
      $timeout(function () {
        ctrl.deletedCard = ctrl.cards.splice(index, 1)[0];
        if (ctrl.deletedCard.saved && ctrl.deletedCard.savedKey) {
          localStorage.removeItem(ctrl.deletedCard.savedKey);
        }
        showDeleteCardToast(i);
        delete ctrl.deletedCard.deleting;
      }, 600);
    } else {
      ctrl.deletedCard = ctrl.cards.splice(index, 1)[0];
    }
  };

  function showDeleteCardToast (i) {
    var toast = $mdToast.simple()
      .textContent('Ticket Deleted')
      .action('UNDO')
      .highlightAction(true)
      .position('top right')
      .hideDelay(3000);

    $mdToast.show(toast).then(function(response) {
      if (response == 'ok') {
        ctrl.cards.splice(i, 0, ctrl.deletedCard);
        if (ctrl.deletedCard.saved && ctrl.deletedCard.savedKey) {
          ctrl.saveTicket(ctrl.deletedCard);
        }
        ctrl.deletedCard = null;
      }
    });
  }

  ctrl.deletedCardSet = null;
  ctrl.deleteAllTickets = function () {
    ctrl.deletedCardSet = angular.copy(ctrl.cards);
    ctrl.cards = [];
    if (ctrl.hasLocalStorage) {
      var len = localStorage.length;
      var key = '';
      var val = '';
      if (len) {
        for (var i = 0; i < len; i++) {
          key = localStorage.key(i);
          if (key && key.indexOf('cn-') === 0) {
            localStorage.removeItem(key);
          }
        }
      }
    };
    var toast = $mdToast.simple()
      .textContent('All Tickets Deleted')
      .action('UNDO')
      .highlightAction(true)
      .position('top right')
      .hideDelay(4000);
    $mdToast.show(toast).then(function(response) {
      if (response == 'ok') {
        ctrl.cards = angular.copy(ctrl.deletedCardSet);
        angular.forEach(ctrl.cards, function (value, key) {
          if (value.saved) ctrl.saveTicket(ctrl.cards[key]);
        });
        ctrl.deletedCardSet = null;
      }
    });
  };
  
  ctrl.saveTicket = function (t) {
    var key = t.savedKey || 'cn-' + Date.now();
    t.savedKey = key;
    t.saved = true;
    localStorage.setItem(key, JSON.stringify(t));
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