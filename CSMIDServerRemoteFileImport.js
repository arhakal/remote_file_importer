var CSMIDServerRemoteFileImport = Class.create();
CSMIDServerRemoteFileImport.prototype = {
    initialize: function() {
        /*
        // Originally created by Marcus Fly (marcus.fly@cloudsherpas.com) and Valor Poland (valor.poland@cloudsherpas.com)
        // Refactored by Martin Wood (martin.wood@servicenow.com).
        */
        //this.debug = probe.getParameter("debug");
        this.debug = true;
        this.logMsg("Starting MID Server File Transfer");
        this.charset = "UTF-8";
        this.LINE_FEED = "\r\n";
        this.boundary = "===" + new Date().getTime() + "===";
        this.probeParameters = this._getProbeParameters();
    },
    getRemoteFileAndUploadToInstance: function() {
        var url = this._getInstanceConnectionURL();
        var conn = this._getURLConnection(url);
        var file = this._getFile();
        var response = this._writeFile(conn, file);
        if (response != 200)
            throw "HTTP response " + response;
        this.logMsg("HTTP response " + response, "debug");
        ms.log("Completed MID Server File Transfer");
        return response;
    },
    _getProbeParameters: function() {
        var probeObj = {};
        probeObj.instance = probe.getParameter("instance");
        probeObj.instanceUser = ms.getConfigParameter("mid.instance.username");
        probeObj.instancePassword = ms.getConfigParameter("mid.instance.password");
        probeObj.filePath = probe.getParameter("filePath");
        probeObj.targetImportSet = probe.getParameter("targetImportSet");
        return probeObj;
    },
    _getInstanceConnectionURL: function() {
        return this._joinParams(this.probeParameters.instance + "sys_import.do", [
            this._encodeParam('sysparm_import_set_tablename', this.probeParameters.targetImportSet),
            this._encodeParam('sysparm_transform_after_load', 'true')
        ]);
    },
    _encodeParam: function(k, v) {
        return k + "=" + Packages.java.net.URLEncoder.encode(v);
    },
    _joinParams: function(base, arr) {
        return base + '?' + arr.join('&');
    },
    _getURLConnection: function(url) {
        if (ms.getConfigParameter("mid.proxy.use_proxy") == 'true') {
            Packages.java.lang.System.setProperty("https.proxyHost", ms.getConfigParameter("mid.proxy.host"));
            Packages.java.lang.System.setProperty("http.proxyHost", ms.getConfigParameter("mid.proxy.host"));
            Packages.java.lang.System.setProperty("https.proxyPort", ms.getConfigParameter("mid.proxy.port"));
            Packages.java.lang.System.setProperty("http.proxyPort", ms.getConfigParameter("mid.proxy.port"));
        }
        var conn = new Packages.java.net.URL(url).openConnection();
        this.logMsg("Sending to : " + url, "debug");
        var userpass = new Packages.java.lang.String(this.probeParameters.instanceUser + ":" + this.probeParameters.instancePassword);
        var basicAuth = "Basic " + (new Packages.javax.xml.bind.DatatypeConverter.printBase64Binary(userpass.getBytes()) + '');
        conn.setRequestProperty("Authorization", basicAuth);
        conn.setDoOutput(true);
        conn.setRequestMethod("POST");
        conn.setUseCaches(false);
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + this.boundary);
        conn.setRequestProperty("User-Agent", "MID Server POST");
        return conn;
    },
    _getFile: function() {
        return new Packages.java.io.File(this.probeParameters.filePath);
    },
    _writeFile: function(conn, uploadFile) {
        var outputStream = conn.getOutputStream();
        var writer = new Packages.java.io.PrintWriter(new Packages.java.io.OutputStreamWriter(outputStream, this.charset), true);
        var fieldName = 'file';
        var fileName = uploadFile.getName();
        this.logMsg("Sending file : " + fileName, "debug");
        writer.append("--" + this.boundary).append(this.LINE_FEED);
        writer.append("Content-Disposition: form-data; name=\"" + fieldName + "\"; filename=\"" + fileName + "\"").append(this.LINE_FEED);
        writer.append("Content-Type: " + Packages.java.net.URLConnection.guessContentTypeFromName(fileName)).append(this.LINE_FEED);
        writer.append("Content-Transfer-Encoding: binary").append(this.LINE_FEED);
        writer.append(this.LINE_FEED).flush();
        this._writeFileData(uploadFile, outputStream);
        writer.append(this.LINE_FEED).flush();
        writer.append(this.LINE_FEED).flush();
        writer.append("--" + this.boundary + "--").append(this.LINE_FEED);
        writer.close();
        return conn.getResponseCode();
    },
    _writeFileData: function(uploadFile, outputStream) {
        var inputStream = new Packages.java.io.FileInputStream(uploadFile);
        var data = new Packages.java.lang.reflect.Array.newInstance(Packages.java.lang.Byte.TYPE, 4096);
        var bytesRead = 0;
        while ((bytesRead = inputStream.read(data)) != -1) {
            outputStream.write(data, 0, bytesRead);
            outputStream.flush();
        }
        inputStream.close();
    },
    logMsg: function(message, logType) {
        logType = logType || 'info';
        var prefixStr = "*** MID Server Remote File";
        if (logType == 'info' || logType == 'error') {
            ms.log(prefixStr + " " + logType.toUpperCase() + "*** " + message);
        }
        if (this.debug && logType == 'debug') {
            ms.log(" DEBUG *** " + message);
        }
    },
    type: 'CSMIDServerRemoteFileImport'
};