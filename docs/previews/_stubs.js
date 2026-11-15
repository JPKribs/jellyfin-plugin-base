// Stubs of the Jellyfin dashboard globals (Dashboard, ApiClient) with mock users and mock paged rows.
// The docs preview shell and the gallery both load this before the bundle, so they share one set of mock data.
// Names that a preview snippet may use: window.__gallery (svg, rect) and window.__galleryData (USERS, ITEMS, COLORS, STATUSES, MEDIA).
(function () {
    function svg(w, h, bg, label) {
        var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
            '<rect width="' + w + '" height="' + h + '" rx="' + Math.min(w, h) / 2 + '" fill="' + bg + '"/>' +
            '<text x="50%" y="54%" font-size="' + (h * 0.4) + '" fill="#fff" text-anchor="middle" ' +
            'dominant-baseline="middle" font-family="sans-serif">' + label + '</text></svg>';
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
    }
    function rect(w, h, bg, label) {
        var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
            '<rect width="' + w + '" height="' + h + '" rx="4" fill="' + bg + '"/>' +
            '<text x="50%" y="55%" font-size="' + (h * 0.5) + '" fill="#fff" text-anchor="middle" ' +
            'dominant-baseline="middle" font-family="sans-serif">' + label + '</text></svg>';
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
    }
    window.__gallery = { svg: svg, rect: rect };

    var COLORS = ['#0088cc', '#9b59b6', '#5cb85c', '#f0ad4e', '#d9534f', '#3498db'];
    var USERS = [
        { Id: 'u1', Name: 'Alice',   Policy: { IsAdministrator: true },  PrimaryImageTag: 't1' },
        { Id: 'u2', Name: 'Bob',     Policy: { IsAdministrator: false }, PrimaryImageTag: 't2' },
        { Id: 'u3', Name: 'Carol',   Policy: { IsAdministrator: false }, PrimaryImageTag: null },
        { Id: 'u4', Name: 'Dave',    Policy: { IsAdministrator: true },  PrimaryImageTag: 't4' },
        { Id: 'u5', Name: 'Eve',     Policy: { IsAdministrator: false }, PrimaryImageTag: 't5' }
    ];

    // Mock media rows for the paginated table.
    var STATUSES = ['Synced', 'Queued', 'Errored', 'Downloading', 'Ignored', 'Imported'];
    var ITEMS = [];
    for (var i = 1; i <= 57; i++) {
        ITEMS.push({
            id: 'item-' + i,
            name: 'Episode ' + i + ', The One With The ' + ['Cache', 'Sync', 'Retry', 'Backoff', 'Token'][i % 5],
            sizeBytes: (i * 37 % 900 + 20) * 1024 * 1024,
            status: STATUSES[i % STATUSES.length]
        });
    }

    // Mock library items for the media card and media picker, with artwork drawn by getImageUrl.
    var MEDIA = [
        { Id: 'media-1', Name: 'Example Movie', Type: 'Movie', ProductionYear: 2010, ImageTags: { Primary: 'p1' } },
        { Id: 'media-2', Name: 'Example Series', Type: 'Series', ProductionYear: 2015, ImageTags: { Primary: 'p2' } },
        { Id: 'media-3', Name: 'Example Episode', Type: 'Episode', ProductionYear: 2016, ImageTags: { Primary: 'p3' } },
        { Id: 'media-4', Name: 'Example Album', Type: 'MusicAlbum', ProductionYear: 2019, ImageTags: { Primary: 'p4' } },
        { Id: 'media-5', Name: 'Example Without Art', Type: 'Movie', ProductionYear: 2021, ImageTags: {} },
        { Id: 'media-6', Name: 'Second Example Movie', Type: 'Movie', ProductionYear: 2022, ImageTags: { Primary: 'p6' } }
    ];

    window.Dashboard = { alert: function (m) { window.alert(typeof m === 'string' ? m : (m && m.message) || 'alert'); } };

    var config = { Demo: true, Count: 1 };
    window.ApiClient = {
        getImageUrl: function (id, o) {
            var m = MEDIA.filter(function (x) { return x.Id === id; })[0];
            var type = m ? m.Type : 'Movie';
            var wide = type === 'Episode' || type === 'Video', square = type === 'MusicAlbum' || type === 'Audio';
            return rect(wide ? 192 : square ? 150 : 120, wide ? 108 : square ? 150 : 180, COLORS[MEDIA.indexOf(m) % COLORS.length] || COLORS[0], m ? m.Name.charAt(8) : '?');
        },
        getUsers: function () { return Promise.resolve(USERS.slice()); },
        getUserImageUrl: function (id, o) {
            var u = USERS.filter(function (x) { return x.Id === id; })[0];
            return svg(56, 56, COLORS[USERS.indexOf(u) % COLORS.length], (u ? u.Name[0] : '?'));
        },
        getPluginConfiguration: function () { return Promise.resolve(JSON.parse(JSON.stringify(config))); },
        updatePluginConfiguration: function (id, c) { config = c; return Promise.resolve(c); },
        getUrl: function (u) { return u; },
        fetch: function (opts) {
            // Serve the mock paginated table from the query string.
            var q = {};
            (opts.url.split('?')[1] || '').split('&').forEach(function (p) {
                var kv = p.split('='); if (kv[0]) q[kv[0]] = decodeURIComponent(kv[1] || '');
            });
            var skip = parseInt(q.skip || '0', 10), take = parseInt(q.take || '50', 10);
            var filtered = ITEMS.filter(function (it) {
                return !q.search || it.name.toLowerCase().indexOf(q.search.toLowerCase()) !== -1;
            });
            return Promise.resolve({ Items: filtered.slice(skip, skip + take), TotalCount: filtered.length });
        }
    };
    window.__galleryData = { USERS: USERS, ITEMS: ITEMS, COLORS: COLORS, STATUSES: STATUSES, MEDIA: MEDIA };
})();
