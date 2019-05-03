(function () {
    /* Extend the type for tablesort */
    function parseNumber(item) {
        var result = /\d+(.\d+)?/g.exec(item);
        return result ? parseFloat(result[0]) : 0;
    }

    function parseTime(item) {
        var result = /(\d+):(\d+):(\d+)(.\d+)?/g.exec(item);
        if (result === null)
            return 0;

        var ret = parseInt(result[1]) * 3600 + parseInt(result[2]) * 60 + parseInt(result[3]);
        if (result.length > 4)
            ret += parseFloat(result[4]);

        return ret;
    }

    Tablesort.extend('number', function (item) {
        return /\d+(.\d+)?/g.exec(item);
    }, function (a, b) {
        return parseNumber(a) - parseNumber(b);
    });

    Tablesort.extend('time', function (item) {
        return /(\d+):(\d+):(\d+)(.\d+)?/g.exec(item);
    }, function (a, b) {
        return parseTime(a) - parseTime(b);
    });

    Tablesort.extend('string', function (item) {
        return true;
    }, function (a, b) {
        return a.localeCompare(b);
    });
}());
