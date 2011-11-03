<?php
	date_default_timezone_set('America/Los_Angeles');
	
	$profile_data = $_POST["profile"];
	
	$dir = scandir('user-profiles/');
	$today = date('Ymd', strtotime('today'));
	$last_file_num = 0;
	foreach($dir as $file) {
		if($file != '.' && $file != '..' && $file != '.DS_Store') {
			$file_name = explode('.', $file);
			if(isset($file_name[0])) {
				$date = explode('-', $file_name[0]);
				$file_num = $date[1];
				$date = $date[0];
					
				if(is_numeric($file_num) && $file_num > $last_file_num && $date == $today) {
					$last_file_num = $file_num;
				}
				if(strtotime('today - 30 days') >= strtotime($date)) {
					unlink('user-profiles/' . $file);
				}
			}
		}
	}
	$new_file_id = $today . '-' . ($last_file_num + 1);
	$new_file_name = 'user-profiles/' . $new_file_id . '.json';
	
	$new_file = fopen($new_file_name, 'w');
	fwrite($new_file, $profile_data);
	fclose($new_file);
	
	function getProfileDirectory() {
		$pageURL = 'http';
		$dir = dirname($_SERVER["REQUEST_URI"]);
		if($dir !== "/") {
			$dir .= "/";
		}
		if ($_SERVER["HTTPS"] == "on") {
			$pageURL .= "s";
		}
		$pageURL .= "://";
		if ($_SERVER["SERVER_PORT"] != "80") {
			$pageURL .= $_SERVER["SERVER_NAME"].":".$_SERVER["SERVER_PORT"].$dir;
		} else {
			$pageURL .= $_SERVER["SERVER_NAME"].$dir;
		}
		return $pageURL;
	}
	
	echo getProfileDirectory() . 'view-profile.php?profile=' . $new_file_id;

?>
