<?php
$servers = $console->getServers();
$cookieServers = $console->getServersCookie();

if (!empty($_COOKIE['filter'])) {
    $visible = explode(',', $_COOKIE['filter']);
} else {
    $visible = array(
        'current-jobs-urgent',
        'current-jobs-ready',
        'current-jobs-reserved',
        'current-jobs-delayed',
        'current-jobs-buried',
        'current-tubes',
        'current-connections',
    );
}
?>
<?php
if (!empty($servers)):
    $servers = array_filter(array_unique($servers));
    ?>
    <div class="row">
        <div class="col-md-12 col-12 mt-4">
            <div class="card bg-body border-0 shadow-sm">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped border-dark-subtle align-middle mb-0" id="servers-index">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <?php foreach ($console->getServerStats(current($servers)) as $key => $item): ?>
                                        <th class="<?php if (!in_array($key, $visible)) echo 'd-none' ?>" name="<?php echo $key ?>"
                                            title="<?php echo $item['description'] ?>"><?php echo ucfirst(str_replace('-', ' ', $key)) ?></th>
                                        <?php endforeach ?>
                                    <th>&nbsp;</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                foreach ($servers as $key => $server):
                                    $stats = $console->getServerStats($server);
                                    $label = $key;
                                    if (empty($label) || is_numeric($label)) {
                                        $label = $server;
                                    }
                                    ?>
                                    <tr>
                                        <?php if (empty($stats)): ?>
                                            <td style="white-space: nowrap;"><?php echo htmlspecialchars($label) ?></td>
                                        <?php else: ?>
                                            <td  style="white-space: nowrap;"><a href="./?server=<?php echo htmlspecialchars($server) ?>" class="link-underline link-underline-opacity-0 link-underline-opacity-75-hover text-info-emphasis"><?php echo htmlspecialchars($label); ?></a></td>
                                        <?php endif ?>
                                        <?php foreach ($stats as $key => $item): ?>
                                            <?php
                                            $classes = array("td-$key");
                                            if (!in_array($key, $visible)) {
                                                $classes[] = 'd-none' ;
                                            }
                                            if (isset($stats[$key]) && $stats[$key] != '0') {
                                                $classes[] = 'hasValue';
                                            }
                                            $cssClass = '' ;
                                            if (count($classes) > 0) {
                                                $cssClass = ' class = "' . join(' ', $classes) . '"' ;
                                            }
                                            ?>
                                            <td <?php echo $cssClass; ?>
                                                name="<?php echo $key ?>"><?php echo htmlspecialchars($item['value']) ?></td>
                                            <?php endforeach ?>
                                            <?php if (empty($stats)): ?>
                                            <td colspan="<?php echo count($visible) ?>" class="row-full">&nbsp;</td>
                                        <?php endif ?>
                                        <td class="text-center"><?php if (array_intersect(array($server), $cookieServers)): ?>
                                                <a class="btn btn-sm btn-danger" title="Remove from list" href="./?action=serversRemove&removeServer=<?php echo htmlspecialchars($server) ?>" style="padding: 2px 5px">Remove</a>
                                                <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endforeach ?>
                            </tbody>
                        </table>
                        <a href="#servers-add" role="button" class="btn btn-success btn-sm mt-3" id="addServer">Add server</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
<?php else: ?>
    <div class="site-wrapper">
        <div class="site-wrapper-inner">
            <div class="col text-center">
                <h1>Hello!</h1>

                <p class="lead">
                    This is Beanstalk console,<br/>web-interface for
                    <a href="http://kr.github.io/beanstalkd/" target="_blank">simple and fast work queue</a>
                </p>

                <p>
                    Your servers' list is empty. You could fix it in two ways:
                <ol class="inside">
                    <li>Click the button below to add server just for you and save it in cookies</li>
                    <li>Edit <b>config.php</b> file and add server for everybody</li>
                </ol>
                </p>
                <p>
                    <br/><a href="#servers-add" role="button" class="btn btn-lg btn-success" data-bs-toggle="modal" data-bs-target="#servers-add">Add server</a>
                </p>
            </div>
        </div>
    </div>



<?php
endif;
if ($tplVars['_tplMain'] != 'ajax') {
    $url = 'https://api.github.com/repos/ptrofimov/beanstalk_console/tags';
    $ctx = stream_context_create(
            array('http' => array(
                    'timeout' => 2,
                    'header' => "Accept-language: en\r\n" .
                    "Cookie: foo=bar\r\n" . // check function.stream-context-create on php.net
                    "User-Agent: " . $_SERVER['HTTP_USER_AGENT'] . "\r\n" .
                    "Accept: application/vnd.github.v3+json\r\n",
                )
    ));

    $json = @file_get_contents($url, false, $ctx);
    if ($json) {
        $document = json_decode($json, true);
        $latest = current($document);
        $version = @$latest['name'];
        if (version_compare($version, $config['version']) > 0) {
            ?>
            <br/>
            <div class="alert alert-info" style="position: relative;top:50px;">
                <span>A new version is available: <b><?php echo $version; ?></b> Get it from <b><a href="https://github.com/ptrofimov/beanstalk_console"
                                                                                                   target="_blank">Github</a></b></span>
            </div>
            <?php
        }
    }
}
?>
