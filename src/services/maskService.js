(function() {
  'use strict';
  angular.module('ngMask')
    .factory('MaskService', ['$log', '$q', function($log, $q){
      function create() {
        var options;
        var maskWithoutOptionals;
        var maskWithoutOptionalsLength = 0;
        var maskWithoutOptionalsAndDivisorsLength = 0;
        var optionalIndexes = [];
        var optionalDivisors = {};
        var optionalDivisorsCombinations = [];
        var divisors = [];
        var divisorElements = {};
        var regex = [];
        var patterns = {
          '9': /[0-9]/,
          '8': /[0-8]/,
          '7': /[0-7]/,
          '6': /[0-6]/,
          '5': /[0-5]/,
          '4': /[0-4]/,
          '3': /[0-3]/,
          '2': /[0-2]/,
          '1': /[0-1]/,
          '0': /[0]/,
          '*': /./,
          'w': /\w/,
          'W': /\W/,
          'd': /\d/,
          'D': /\D/,
          's': /\s/,
          'S': /\S/,
          'b': /\b/,
          'A': /[A-Z]/,
          'a': /[a-z]/,
          'Z': /[A-ZÇÀÁÂÃÈÉÊẼÌÍÎĨÒÓÔÕÙÚÛŨ]/,
          'z': /[a-zçáàãâéèêẽíìĩîóòôõúùũüû]/,
          '@': /[a-zA-Z]/,
          '#': /[a-zA-ZçáàãâéèêẽíìĩîóòôõúùũüûÇÀÁÂÃÈÉÊẼÌÍÎĨÒÓÔÕÙÚÛŨ]/,
          '%': /[0-9a-zA-ZçáàãâéèêẽíìĩîóòôõúùũüûÇÀÁÂÃÈÉÊẼÌÍÎĨÒÓÔÕÙÚÛŨ]/
        };

        function getOptionals(mask) {
          var indexes = [];

          try {
            var regexp = /\?/g;
            var match = [];

            while ((match = regexp.exec(mask)) != null) {
              // Save the optional char
              indexes.push((match.index - 1));
            }
          } catch (e) {
            $log.error('[MaskService - getOptionals]');
            throw e;
          }

          return {
            fromMask: function() {
              return indexes;
            },
            fromMaskWithoutOptionals: function() {
              return getOptionalsRelativeMaskWithoutOptionals(indexes);
            }
          };
        }

        function getOptionalsRelativeMaskWithoutOptionals(optionals) {
          var indexes = [];
          for (var i=0; i<optionals.length; i++) {
            indexes.push(optionals[i]-i);
          }
          return indexes;
        }

        function removeOptionals(mask) {
          var newMask;

          try {
            newMask = mask.replace(/\?/g, '');
          } catch (e) {
            $log.error('[MaskService - removeOptionals]');
            throw e;
          }

          return newMask;
        }

        function uniqueArray(array) {
          var u = {};
          var a = [];

          for (var i = 0, l = array.length; i < l; ++i) {
            if(u.hasOwnProperty(array[i])) {
              continue;
            }

            a.push(array[i]);
            u[array[i]] = 1;
          }

          return a;
        }

        function inArray(i, array) {
          var output;

          try {
            output = array.indexOf(i) > -1;
          } catch (e) {
            $log.error('[MaskService - inArray]');
            throw e;
          }

          return output;
        }

        function isDivisor(currentPos) {
          return inArray(currentPos, divisors);
        }

        function isOptional(currentPos) {
          return inArray(currentPos, optionalIndexes);
        }

        function generateIntermetiateRegex(i, forceOptional) {
          function generateIntermetiateElementRegex(i, forceOptional) {
            var charRegex;
            try {
              var element = maskWithoutOptionals[i];
              var elementRegex = patterns[element];
              var hasOptional = isOptional(i);

              if (elementRegex) {
                charRegex = '(' + elementRegex.source + ')';
              } else { // is a divisor
                if (!isDivisor(i)) {
                  divisors.push(i);
                  divisorElements[i] = element;
                }

                charRegex = '(' + '\\' + element + ')';
              }
            } catch (e) {
              $log.error('[MaskService - generateIntermetiateElementRegex]');
              throw e;
            }

            if (hasOptional || forceOptional) {
              charRegex += '?';
            }

            return new RegExp(charRegex);
          }

          var elementRegex
          var elementOptionalRegex;
          try {
            var intermetiateElementRegex = generateIntermetiateElementRegex(i, forceOptional);
            elementRegex = intermetiateElementRegex;

            var hasOptional = isOptional(i);
            var currentRegex = intermetiateElementRegex.source;

            if (hasOptional && ((i+1) < maskWithoutOptionalsLength)) {
              var intermetiateRegex = generateIntermetiateRegex((i+1), true).elementOptionalRegex();
              currentRegex += intermetiateRegex.source;
            }

            elementOptionalRegex = new RegExp(currentRegex);
          } catch (e) {
            $log.error('[MaskService - generateIntermetiateRegex]');
            throw e;
          }
          return {
            elementRegex: function() {
              return elementRegex;
            },
            elementOptionalRegex: function() {
              // from element regex, gets the flow of regex until first not optional
              return elementOptionalRegex;
            }
          };
        }

        function generateRegex(opts) {
          var deferred = $q.defer();

          function generateOptionalDivisors() {
            function sortNumber(a,b) {
                return a - b;
            }

            var sortedDivisors = divisors.sort(sortNumber);
            var sortedOptionals = optionalIndexes.sort(sortNumber);
            for (var i = 0; i<sortedDivisors.length; i++) {
              var divisor = sortedDivisors[i];
              for (var j = 1; j<=sortedOptionals.length; j++) {
                var optional = sortedOptionals[(j-1)];
                if (optional >= divisor) {
                  break;
                }

                if (optionalDivisors[divisor]) {
                  optionalDivisors[divisor] = optionalDivisors[divisor].concat(divisor-j);
                } else {
                  optionalDivisors[divisor] = [(divisor-j)];
                }

                // get the original divisor for alternative divisor
                divisorElements[(divisor-j)] = divisorElements[divisor];
              }
            }
          }

          options = opts;

          try {
            var mask = opts['mask'];
            var repeat = opts['repeat'];

            if (repeat) {
              mask = Array((parseInt(repeat)+1)).join(mask);
            }

            optionalIndexes = getOptionals(mask).fromMaskWithoutOptionals();
            options['maskWithoutOptionals'] = maskWithoutOptionals = removeOptionals(mask);
            maskWithoutOptionalsLength = maskWithoutOptionals.length;

            var cumulativeRegex;
            for (var i=0; i<maskWithoutOptionalsLength; i++) {
              var charRegex = generateIntermetiateRegex(i);
              var elementRegex = charRegex.elementRegex();
              var elementOptionalRegex = charRegex.elementOptionalRegex();

              var newRegex = cumulativeRegex ? cumulativeRegex.source + elementOptionalRegex.source : elementOptionalRegex.source;
              newRegex = new RegExp(newRegex);
              cumulativeRegex = cumulativeRegex ? cumulativeRegex.source + elementRegex.source : elementRegex.source;
              cumulativeRegex = new RegExp(cumulativeRegex);

              regex.push(newRegex);
            }

            generateOptionalDivisors();
            maskWithoutOptionalsAndDivisorsLength = removeDivisors(maskWithoutOptionals).length;

            deferred.resolve({
              options: options,
              divisors: divisors,
              divisorElements: divisorElements,
              optionalIndexes: optionalIndexes,
              optionalDivisors: optionalDivisors,
              optionalDivisorsCombinations: optionalDivisorsCombinations
            });
          } catch (e) {
            $log.error('[MaskService - generateRegex]');
            deferred.reject(e);
            throw e;
          }

          return deferred.promise;
        }

        function getRegex(index) {
          var currentRegex;

          try {
            currentRegex = regex[index] ? regex[index].source : '';
          } catch (e) {
            $log.error('[MaskService - getRegex]');
            throw e;
          }

          return (new RegExp('^' + currentRegex + '$'));
        }

        function getOptions() {
          return options;
        }

        function removeDivisors(value) {
          try {
            if (divisors.length > 0) {
              var keys = Object.keys(divisorElements);
              var elments = [];

              for (var i = keys.length - 1; i >= 0; i--) {
                var divisor = divisorElements[keys[i]];
                if (divisor) {
                  elments.push(divisor);
                }
              }

              elments = uniqueArray(elments);

              // remove if it is not pattern
              var regex = new RegExp(('[' + '\\' + elments.join('\\') + ']'), 'g');
              return value.replace(regex, '');
            } else {
              return value;
            }
          } catch (e) {
            $log.error('[MaskService - removeDivisors]');
            throw e;
          }
        }

        // sets: an array of arrays
        // f: your callback function
        // context: [optional] the `this` to use for your callback
        // http://phrogz.net/lazy-cartesian-product
        function lazyProduct(sets, f, context){
          if (!context){
            context=this;
          }

          var p = [];
          var max = sets.length-1;
          var lens = [];

          for (var i=sets.length;i--;) {
            lens[i] = sets[i].length;
          }

          function dive(d){
            var a = sets[d];
            var len = lens[d];

            if (d === max) {
              for (var i=0;i<len;++i) {
                p[d] = a[i];
                f.apply(context, p);
              }
            } else {
              for (var i=0;i<len;++i) {
                p[d]=a[i];
                dive(d+1);
              }
            }

            p.pop();
          }

          dive(0);
        }


        function tryDivisorConfiguration(value) {
          function insertDivisors(array, divisors) {
            var output = array;

            if (!angular.isArray(array) || !angular.isArray(divisors)) {
              return output;
            }

            for (var i=0; i<divisors.length; i++) {
              var divisor = divisors[i];
              if (divisor < output.length) {
                output.splice(divisor, 0, divisorElements[divisor]);
              }
            }

            return output;
          }

          var output = value.split('');
          var defaultDivisors = true;

          // has optional?
          if (optionalIndexes.length > 0) {
            var lazyArguments = [];
            var optionalDivisorsKeys = Object.keys(optionalDivisors);

            // get all optional divisors as array of arrays [[], [], []...]
            for (var i=0; i<optionalDivisorsKeys.length; i++) {
              var val = optionalDivisors[optionalDivisorsKeys[i]];
              lazyArguments.push(val);
            }

            // generate all possible configurations
            if (optionalDivisorsCombinations.length === 0) {
              lazyProduct(lazyArguments, function() {
                // convert arguments to array
                optionalDivisorsCombinations.push(Array.prototype.slice.call(arguments));
              });
            }

            for (var i = optionalDivisorsCombinations.length - 1; i >= 0; i--) {
              var outputClone = angular.copy(output);
              outputClone = insertDivisors(outputClone, optionalDivisorsCombinations[i]);

              // try validation
              var viewValueWithDivisors = outputClone.join('');
              var regex = getRegex(maskWithoutOptionals.length - 1);

              if (regex.test(viewValueWithDivisors)) {
                defaultDivisors = false;
                output = outputClone;
                break;
              }
            }
          }

          if (defaultDivisors) {
            output = insertDivisors(output, divisors);
          }

          return output.join('');
        }

        function getViewValue(value) {
          try {
            var outputWithoutDivisors = removeDivisors(value);
            var output = tryDivisorConfiguration(outputWithoutDivisors);

            return {
              withDivisors: function(capped) {
                if (capped) {
                  return output.substr(0, maskWithoutOptionalsLength);
                } else {
                  return output;
                }
              },
              withoutDivisors: function(capped) {
                if (capped) {
                  return outputWithoutDivisors.substr(0, maskWithoutOptionalsAndDivisorsLength);
                } else {
                  return outputWithoutDivisors;
                }
              }
            };
          } catch (e) {
            $log.error('[MaskService - getViewValue]');
            throw e;
          }
        }

        function getWrongPositions(viewValueWithDivisors, onlyFirst) {
          var pos = [];

          if (!viewValueWithDivisors) {
            return 0;
          }

          for (var i=0; i<viewValueWithDivisors.length; i++){
            var pattern = getRegex(i);
            var value = viewValueWithDivisors.substr(0, (i+1));

            if(pattern && !pattern.test(value)){
              pos.push(i);

              if (onlyFirst) {
                break;
              }
            }
          }

          return pos;
        }

        function getFirstWrongPosition(viewValueWithDivisors) {
          return getWrongPositions(viewValueWithDivisors, true)[0];
          // return (typeof first === 'number') ? first : viewValueWithDivisors.length;
        }

        function removeWrongPositions(viewValueWithDivisors) {
          var wrongPositions = getWrongPositions(viewValueWithDivisors, false);
          var newViewValue = viewValueWithDivisors;

          for (var i in wrongPositions) {
            var wrongPosition = wrongPositions[i];
            var viewValueArray = viewValueWithDivisors.split('');
            viewValueArray.splice(wrongPosition, 1);
            newViewValue = viewValueArray.join('');
          }

          return getViewValue(newViewValue);
        }

        return {
          getViewValue: getViewValue,
          generateRegex: generateRegex,
          getRegex: getRegex,
          getOptions: getOptions,
          removeDivisors: removeDivisors,
          getFirstWrongPosition: getFirstWrongPosition,
          removeWrongPositions: removeWrongPositions
        }
      }

      return {
        create: create
      }
    }]);
})();