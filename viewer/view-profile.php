<!DOCTYPE HTML>
<html>
<head>
<meta charset="UTF-8">
<title>Profile Viewer</title>
<link href="viewer.css" rel="stylesheet" type="text/css">
<script src="http://code.jquery.com/jquery-1.6.4.js"></script>
<script src="viewer.js"></script>
<script>
$(function() {
	loadProfile( "<?php echo $_GET["profile"]?>" );
});
</script>
</head>

<body>
<div id="graphs">
</div>
</body>
</html>
