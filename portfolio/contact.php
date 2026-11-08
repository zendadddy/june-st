<?php
// Contact form handler: emails the message to Frank. Runs on Cloudways (turn on the SMTP add-on so mail lands in the inbox, not spam).
header('Content-Type: application/json');
$to = 'f@francoisbach.com';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }
if (!empty($_POST['website'])) { echo '{"ok":true}'; exit; } // honeypot: bots fill the hidden field
$clean = function ($v, $max) { return trim(mb_substr(str_replace(["\r", "\0"], '', (string)$v), 0, $max)); };
$name = $clean($_POST['name'] ?? '', 200);
$email = filter_var($clean($_POST['email'] ?? '', 200), FILTER_VALIDATE_EMAIL);
$msg = $clean($_POST['message'] ?? '', 5000);
if ($name === '' || !$email || $msg === '') { http_response_code(422); echo '{"ok":false}'; exit; }
$name1 = str_replace("\n", ' ', $name);
$subject = '=?UTF-8?B?' . base64_encode("New message from $name1 via francoisbach.com") . '?=';
$body = "From: $name1 <$email>\n\n$msg\n";
$headers = "From: Contact form <f@francoisbach.com>\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8\r\n";
$ok = mail($to, $subject, $body, $headers, '-ff@francoisbach.com');
if (!$ok) http_response_code(500);
echo json_encode(['ok' => $ok]);
