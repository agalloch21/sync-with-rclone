// https://docs.unity3d.com/6000.0/Documentation/Manual/web-interacting-browser-deprecated.html
// Deprecated code	| Replacement code
// -----------------+-----------------
// dynCall()	    | makeDynCall()

var Lib_BEST_HTTP_WebGL_WS_Bridge =
{
	$ws: {
		webSocketInstances: {},
		nextInstanceId : 1,
        /*UTF8Decoder: new TextDecoder('utf8'),*/

		Set : function(socket) {
			ws.webSocketInstances[ws.nextInstanceId] = socket;
			return ws.nextInstanceId++;
		},

		Get : function(id) {
			return ws.webSocketInstances[id];
		},

		Remove: function(id) {
			delete ws.webSocketInstances[id];
		},

		_callOnClose: function(onClose, id, code, reason)
		{
			var length = lengthBytesUTF8(reason) + 1;
			var buffer = _malloc(length);

			stringToUTF8Array(reason, HEAPU8, buffer, length);

			{{{ makeDynCall('viii', 'onClose') }}}(id, code, buffer);

			_free(buffer);
		},

		_callOnError: function(errCallback, id, reason)
		{
			var length = lengthBytesUTF8(reason) + 1;
			var buffer = _malloc(length);

			stringToUTF8Array(reason, HEAPU8, buffer, length);

			{{{ makeDynCall('vii', 'errCallback') }}}(id, buffer);

			_free(buffer);
		}
	},

	WS_Create: function(url, protocol, onOpen, onText, onBinary, onError, onClose, allocator)
	{
		var urlStr = new URL(UTF8ToString(url)); ///*encodeURI*/(UTF8ToString(url)).replace(/\+/g, '%2B').replace(/%252[fF]/ig, '%2F');
		var proto = UTF8ToString(protocol);

		console.log('WS_Create(' + urlStr + ', "' + proto + '")');

		var socket = {
			onError: onError,
			onClose: onClose
		};

		if (proto == '')
			socket.socketImpl = new WebSocket(urlStr);
		else
			socket.socketImpl = new WebSocket(urlStr, proto.trim().split(","));

		var id = ws.nextInstanceId;
		socket.socketImpl.binaryType = "arraybuffer";

		socket.socketImpl.onopen = function(e) {
			console.log(id + ' WS_Create - onOpen');

			{{{ makeDynCall('vi', 'onOpen') }}}(id);
		};

		const encoder = new TextEncoder();
		socket.socketImpl.onmessage = function (e)
		{
			// Binary?
			if (e.data instanceof ArrayBuffer)
			{
				var byteArray = new Uint8Array(e.data);
				const array = {{{ makeDynCall('iii', 'allocator') }}}(id, byteArray.length);
				
				const numArr = HEAPU8.subarray(array, array + 4);
				const originalLength = (numArr[0] << 24) | (numArr[1] << 16) | (numArr[2] << 8) | (numArr[3]);
				HEAPU8.set(byteArray, array);

				{{{ makeDynCall('viiii', 'onBinary') }}}(id, array, originalLength, byteArray.length);
			}
			else // Text
			{
				// https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encodeInto#buffer_sizing
				// "If the output allocation (typically within Wasm heap) is expected to be short-lived, it makes sense to allocate s.length * 3 bytes for the output, 
				//	in which case the first conversion attempt is guaranteed to convert the whole string."
				const length = e.data.length * 3;
				const array = {{{ makeDynCall('iii', 'allocator') }}}(id, length);
				
				const numArr = HEAPU8.subarray(array, array + 4);
				const originalLength = (numArr[0] << 24) | (numArr[1] << 16) | (numArr[2] << 8) | (numArr[3]);
				const ret = encoder.encodeInto(e.data, HEAPU8.subarray(array));
				
				{{{ makeDynCall('viiii', 'onText') }}}(id, array, originalLength, ret.written);
			}
		};
		socket.socketImpl.onclose = function (e) {
			console.log(id + ' WS_Create - onClose ' + e.code + ' ' + e.reason);

			ws._callOnClose(onClose, id, e.code, e.reason);
		};

		return ws.Set(socket);
	},

	WS_GetState: function (id)
	{
		var socket = ws.Get(id);

		if (typeof socket === 'undefined' ||
			socket == null ||
			typeof socket.socketImpl === 'undefined' ||
			socket.socketImpl == null)
			return 3; // closed

		return socket.socketImpl.readyState;
	},

    WS_GetBufferedAmount: function (id)
	{
		var socket = ws.Get(id);
		return socket.socketImpl.bufferedAmount;
	},

	WS_Send_String: function (id, ptr, pos, length)
	{
		var socket = ws.Get(id);

        var startPtr = ptr + pos;
        var endPtr = startPtr + length;

        var UTF8Decoder = new TextDecoder('utf8');
        var str = UTF8Decoder.decode(HEAPU8.subarray ? HEAPU8.subarray(startPtr, endPtr) : new Uint8Array(HEAPU8.slice(startPtr, endPtr)));

		try
		{
			socket.socketImpl.send(str);
		}
		catch(e) {
			ws._callOnError(socket.onError, id, ' ' + e.name + ': ' + e.message);
		}

		return socket.socketImpl.bufferedAmount;
	},

	WS_Send_Binary: function(id, ptr, pos, length)
	{
		var socket = ws.Get(id);

		try
		{
			var buff = HEAPU8.subarray(ptr + pos, ptr + pos + length);
			socket.socketImpl.send(buff /*HEAPU8.buffer.slice(ptr + pos, ptr + pos + length)*/);
		}
		catch(e) {
			ws._callOnError(socket.onError, id, ' ' + e.name + ': ' + e.message);
		}

		return socket.socketImpl.bufferedAmount;
	},

	WS_Close: function (id, code, reason)
	{
		var socket = ws.Get(id);
		var reasonStr = UTF8ToString(reason);

		console.log(id + ' WS_Close(' + code + ', ' + reasonStr + ')');

		socket.socketImpl.close(/*ulong*/code, reasonStr);
	},

	WS_Release: function(id)
	{
		console.log(id + ' WS_Release');

		ws.Remove(id);
	}
};

autoAddDeps(Lib_BEST_HTTP_WebGL_WS_Bridge, '$ws');
mergeInto(LibraryManager.library, Lib_BEST_HTTP_WebGL_WS_Bridge);
