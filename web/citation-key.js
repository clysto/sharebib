var citeKeyFormat = '%a_%t_%y';

var numberRe = /^[0-9]+/;
// Below is a list of words that should not appear as part of the citation key
// it includes the indefinite articles of English, German, French and Spanish, as well as a small set of English prepositions whose
// force is more grammatical than lexical, i.e. which are likely to strike many as 'insignificant'.
// The assumption is that most who want a title word in their key would prefer the first word of significance.
// Also remove markup
var citeKeyTitleBannedRe =
  /\b(a|an|the|some|from|on|in|to|of|do|with|der|die|das|ein|eine|einer|eines|einem|einen|un|une|la|le|l\'|les|el|las|los|al|uno|una|unos|unas|de|des|del|d\')(\s+|\b)|(<\/?(i|b|sup|sub|sc|span style=\"small-caps\"|span)>)/g;
var citeKeyConversionsRe = /%([a-zA-Z])/;

var citeKeyConversions = {
  a: function (flags, item) {
    if (item.creators && item.creators[0] && item.creators[0].lastName) {
      return item.creators[0].lastName
        .toLowerCase()
        .replace(/ /g, '_')
        .replace(/,/g, '');
    }
    return 'noauthor';
  },
  t: function (flags, item) {
    if (item['title']) {
      return item['title']
        .toLowerCase()
        .replace(citeKeyTitleBannedRe, '')
        .split(/\s+/g)[0];
    }
    return 'notitle';
  },
  y: function (flags, item) {
    if (item.date) {
      var date = strToDate(item.date);
      if (date.year && numberRe.test(date.year)) {
        return date.year;
      }
    }
    return 'nodate';
  },
};

export function buildCiteKey(item, extraFields, citekeys) {
  if (extraFields) {
    const citationKey = extraFields.findIndex(
      (field) =>
        field.field &&
        field.value &&
        field.field.toLowerCase() === 'citation key'
    );
    if (citationKey >= 0) return extraFields.splice(citationKey, 1)[0].value;
  }

  if (item.citationKey) return item.citationKey;

  var basekey = '';
  var counter = 0;
  var citeKeyFormatRemaining = citeKeyFormat;
  while (citeKeyConversionsRe.test(citeKeyFormatRemaining)) {
    if (counter > 100) {
      break;
    }
    var m = citeKeyFormatRemaining.match(citeKeyConversionsRe);
    if (m.index > 0) {
      //add data before the conversion match to basekey
      basekey = basekey + citeKeyFormatRemaining.substr(0, m.index);
    }
    var flags = ''; // for now
    var f = citeKeyConversions[m[1]];
    if (typeof f == 'function') {
      var value = f(flags, item);
      //add conversion to basekey
      basekey = basekey + value;
    }
    citeKeyFormatRemaining = citeKeyFormatRemaining.substr(m.index + m.length);
    counter++;
  }
  if (citeKeyFormatRemaining.length > 0) {
    basekey = basekey + citeKeyFormatRemaining;
  }

  // for now, remove any characters not explicitly known to be allowed;
  // we might want to allow UTF-8 citation keys in the future, depending
  // on implementation support.
  //
  // no matter what, we want to make sure we exclude
  // " # % ' ( ) , = { } ~ and backslash
  // however, we want to keep the base characters

  basekey = tidyAccents(basekey);
  // use legacy pattern for all old items to not break existing usages
  var citeKeyCleanRe = /[^a-z0-9\!\$\&\*\+\-\.\/\:\;\<\>\?\[\]\^\_\`\|]+/g;
  // but use the simple pattern for all newly added items
  // or always if the hiddenPref is set
  // extensions.zotero.translators.BibTeX.export.simpleCitekey
  basekey = basekey.replace(citeKeyCleanRe, '');
  var citekey = basekey;
  var i = 0;
  while (citekeys[citekey]) {
    i++;
    citekey = basekey + '-' + i;
  }
  citekeys[citekey] = true;
  return citekey;
}

function tidyAccents(s) {
  var r = s.toLowerCase();

  r = r.replace(new RegExp('[ä]', 'g'), 'ae');
  r = r.replace(new RegExp('[ö]', 'g'), 'oe');
  r = r.replace(new RegExp('[ü]', 'g'), 'ue');
  r = r.replace(new RegExp('[àáâãå]', 'g'), 'a');
  r = r.replace(new RegExp('æ', 'g'), 'ae');
  r = r.replace(new RegExp('ç', 'g'), 'c');
  r = r.replace(new RegExp('[èéêë]', 'g'), 'e');
  r = r.replace(new RegExp('[ìíîï]', 'g'), 'i');
  r = r.replace(new RegExp('ñ', 'g'), 'n');
  r = r.replace(new RegExp('[òóôõ]', 'g'), 'o');
  r = r.replace(new RegExp('œ', 'g'), 'oe');
  r = r.replace(new RegExp('[ùúû]', 'g'), 'u');
  r = r.replace(new RegExp('[ýÿ]', 'g'), 'y');

  return r;
}

var _slashRe =
  /^(.*?)\b([0-9]{1,4})(?:([\-\/\.\u5e74])([0-9]{1,2}))?(?:([\-\/\.\u6708])([0-9]{1,4}))?((?:\b|[^0-9]).*?)$/;
var _yearRe =
  /^(.*?)\b((?:circa |around |about |c\.? ?)?[0-9]{1,4}(?: ?B\.? ?C\.?(?: ?E\.?)?| ?C\.? ?E\.?| ?A\.? ?D\.?)|[0-9]{3,4})\b(.*?)$/i;
var _monthRe = null;
var _dayRe = null;

function strToDate(string) {
  var date = {
    order: '',
  };

  if (typeof string == 'string' || typeof string == 'number') {
    string = trimInternal(string.toString());
  }

  // skip empty things
  if (!string) {
    return date;
  }

  var parts = [];

  // first, directly inspect the string
  var m = _slashRe.exec(string);
  if (
    m &&
    (!m[5] ||
      !m[3] ||
      m[3] == m[5] ||
      (m[3] == '\u5e74' && m[5] == '\u6708')) && // require sane separators
    ((m[2] && m[4] && m[6]) || (!m[1] && !m[7]))
  ) {
    // require that either all parts are found,
    // or else this is the entire date field
    // figure out date based on parts
    if (m[2].length == 3 || m[2].length == 4 || m[3] == '\u5e74') {
      // ISO 8601 style date (big endian)
      date.year = m[2];
      date.month = m[4];
      date.day = m[6];
      date.order += m[2] ? 'y' : '';
      date.order += m[4] ? 'm' : '';
      date.order += m[6] ? 'd' : '';
    } else if (m[2] && !m[4] && m[6]) {
      date.month = m[2];
      date.year = m[6];
      date.order += m[2] ? 'm' : '';
      date.order += m[6] ? 'y' : '';
    } else {
      // local style date (middle or little endian)
      var country = 'US';
      if (
        country == 'US' || // The United States
        country == 'FM' || // The Federated States of Micronesia
        country == 'PW' || // Palau
        country == 'PH'
      ) {
        // The Philippines
        date.month = m[2];
        date.day = m[4];
        date.order += m[2] ? 'm' : '';
        date.order += m[4] ? 'd' : '';
      } else {
        date.month = m[4];
        date.day = m[2];
        date.order += m[2] ? 'd' : '';
        date.order += m[4] ? 'm' : '';
      }
      date.year = m[6];
      if (m[6] !== undefined) {
        date.order += 'y';
      }
    }

    var longYear = date.year && date.year.toString().length > 2;
    if (date.year) date.year = parseInt(date.year, 10);
    if (date.day) date.day = parseInt(date.day, 10);
    if (date.month) {
      date.month = parseInt(date.month, 10);

      if (date.month > 12) {
        // swap day and month
        var tmp = date.day;
        date.day = date.month;
        date.month = tmp;
        date.order = date.order
          .replace('m', 'D')
          .replace('d', 'M')
          .replace('D', 'd')
          .replace('M', 'm');
      }
    }

    if ((!date.month || date.month <= 12) && (!date.day || date.day <= 31)) {
      // Parse pre-100 years with leading zeroes (001, 0001, 012, 0012, 0123, but not 08)
      if (date.year && date.year < 100 && !longYear) {
        var today = new Date();
        var year = today.getFullYear();
        var twoDigitYear = year % 100;
        var century = year - twoDigitYear;

        if (date.year <= twoDigitYear) {
          // assume this date is from our century
          date.year = century + date.year;
        } else {
          // assume this date is from the previous century
          date.year = century - 100 + date.year;
        }
      }

      if (date.month) date.month--; // subtract one for JS style
      else delete date.month;

      parts.push({ part: m[1], before: true }, { part: m[7] });
    } else {
      // give up; we failed the sanity check
      var date = {
        order: '',
      };
      parts.push({ part: string });
    }
  } else {
    parts.push({ part: string });
  }

  // couldn't find something with the algorithms; use regexp
  // YEAR
  if (!date.year) {
    for (var i in parts) {
      var m = _yearRe.exec(parts[i].part);
      if (m) {
        date.year = m[2];
        date.order = _insertDateOrderPart(date.order, 'y', parts[i]);
        parts.splice(i, 1, { part: m[1], before: true }, { part: m[3] });
        break;
      }
    }
  }

  // MONTH
  if (date.month === undefined) {
    // compile month regular expression
    let months = getMonths(true); // no 'this' for translator sandbox
    months = months.short
      .map((m) => m.toLowerCase())
      .concat(months.long.map((m) => m.toLowerCase()));
    for (var i in parts) {
      var m = null;
      if (m) {
        // Modulo 12 in case we have multiple languages
        date.month = months.indexOf(m[2].toLowerCase()) % 12;
        date.order = _insertDateOrderPart(date.order, 'm', parts[i]);
        parts.splice(
          i,
          1,
          { part: m[1], before: 'm' },
          { part: m[3], after: 'm' }
        );
        break;
      }
    }
  }

  // DAY
  if (!date.day) {
    // compile day regular expression
    if (!_dayRe) {
      var daySuffixes = '';
      _dayRe = new RegExp(
        '\\b([0-9]{1,2})(?:' + daySuffixes + ')?\\b(.*)',
        'i'
      );
    }

    for (var i in parts) {
      var m = _dayRe.exec(parts[i].part);
      if (m) {
        var day = parseInt(m[1], 10);
        // Sanity check
        if (day <= 31) {
          date.day = day;
          date.order = _insertDateOrderPart(date.order, 'd', parts[i]);
          if (m.index > 0) {
            var part = parts[i].part.substr(0, m.index);
            if (m[2]) {
              part += ' ' + m[2];
            }
          } else {
            var part = m[2];
          }
          parts.splice(i, 1, { part: part });
          break;
        }
      }
    }
  }

  // Concatenate date parts
  date.part = '';
  for (var i in parts) {
    date.part += parts[i].part + ' ';
  }

  // clean up date part
  if (date.part) {
    date.part = date.part.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
  }

  if (date.part === '' || date.part == undefined) {
    delete date.part;
  }

  //make sure year is always a string
  if (date.year || date.year === 0) date.year += '';

  return date;
}

function trimInternal(s) {
  if (typeof s != 'string') {
    throw new Error('trimInternal: argument must be a string');
  }

  s = s.replace(/[\xA0\r\n\s]+/g, ' ');
  return trim(s);
}

function trim(s) {
  if (typeof s != 'string') {
    throw new Error('trim: argument must be a string');
  }

  s = s.replace(/^\s+/, '');
  return s.replace(/\s+$/, '');
}

function getMonths() {
  return {
    short: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    long: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  };
}

function _insertDateOrderPart(dateOrder, part, partOrder) {
  if (!dateOrder) {
    return part;
  }
  if (partOrder.before === true) {
    return part + dateOrder;
  }
  if (partOrder.after === true) {
    return dateOrder + part;
  }
  if (partOrder.before) {
    var pos = dateOrder.indexOf(partOrder.before);
    if (pos == -1) {
      return dateOrder;
    }
    return dateOrder.replace(
      new RegExp('(' + partOrder.before + ')'),
      part + '$1'
    );
  }
  if (partOrder.after) {
    var pos = dateOrder.indexOf(partOrder.after);
    if (pos == -1) {
      return dateOrder + part;
    }
    return dateOrder.replace(
      new RegExp('(' + partOrder.after + ')'),
      '$1' + part
    );
  }
  return dateOrder + part;
}
