<?php
$servers = $console->getServers();
if ($server) {
    $serverKey = array_search($server, $servers);
    $serverLabel = is_numeric($serverKey) || empty($serverKey) ? $server : $serverKey;
}
?><!DOCTYPE html>
<html>

    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>
            <?php if ($tube) echo $tube . ' - ' ?>
            <?php echo !empty($serverLabel) ? $serverLabel : 'All servers' ?> -
            Beanstalk console
        </title>

        <!-- Bootstrap core CSS -->
        <link href="assets/vendor/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="assets/vendor/@fortawesome/fontawesome-free/css/all.min.css" rel="stylesheet">
        <link href="assets/vendor/remixicon/remixicon.css" rel="stylesheet">
        <link href="assets/vendor/json-viewer/jquery.json-viewer.css?_ver=<?php echo time(); ?>" rel="stylesheet">
        <link href="css/customer.css?_ver=<?php echo time(); ?>" rel="stylesheet">
        <link href="highlight/styles/magula.css" rel="stylesheet">
        <link rel="shortcut icon" href="assets/bs-rounded.png">
        <script>
            var url = "./?server=<?php echo $server ?>";
            var contentType = "<?php echo isset($contentType) ? $contentType : '' ?>";
        </script>

        <!-- HTML5 shim and Respond.js IE8 support of HTML5 elements and media queries -->
        <!--[if lt IE 9]>
        <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
        <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
        <![endif]-->
    </head>

    <?php if (!empty($servers)): ?>
        <body class="no-nav bg-body-tertiary mt-3" data-bs-theme="dark">
        <?php else: ?>
        <body class="bg-body-tertiary" data-bs-theme="dark">
        <?php endif ?>

        <div class="container-fluid">

            <?php if (!empty($servers)): ?>
                <nav class="navbar navbar-expand-lg sticky-top bg-body rounded-3 mx-3 shadow-sm" role="navigation">
                    <div class="container-fluid">
                        <a class="navbar-brand" href="./?">
                            <img src="<?php echo "assets/bs-rounded.png"; ?>" alt="Beanstalk Console" width="22" height="22" class="rounded-circle mb-1">
                            <span>Beanstalk Console</span>
                        </a>
                        <button class="border-0 btn btn-sm navbar-toggler" style="padding-left: 5px;padding-right: 5px; " type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                            <i class="ri-menu-line"></i>
                        </button>

                        <div class="collapse navbar-collapse" id="navbarSupportedContent">
                            <ul class="navbar-nav me-auto mb-2 mb-lg-0">

                                <?php if ($server): ?>
                                    <!-- Server dropdown: current, then All, then remaining -->
                                    <li class="nav-item dropdown">
                                        <a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown">
                                            <?php echo $serverLabel ?> <span class="caret"></span>
                                        </a>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item fs-14px" href="./?">All servers</a></li>
                                            <?php foreach (array_diff($servers, array($server)) as $key => $serverItem): ?>
                                            <li><a class="dropdown-item fs-14px" href="./?server=<?php echo htmlspecialchars($serverItem) ?>"><?php echo empty($key) || is_numeric($key) ? htmlspecialchars($serverItem) : $key ?></a></li>
                                            <?php endforeach ?>
                                        </ul>
                                    </li>
                                <?php else: ?>
                                    <!-- Server dropdown: All, then remaining -->
                                    <li class="nav-item dropdown">
                                        <a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown">
                                            All servers <span class="caret"></span>
                                        </a>
                                        <ul class="dropdown-menu" style="max-height: 350px;overflow-y: scroll;">
                                            <?php foreach ($servers as $key => $serverItem): ?>
                                                <li><a class="dropdown-item fs-14px" href="./?server=<?php echo htmlspecialchars($serverItem) ?>"><?php echo empty($key) || is_numeric($key) ? htmlspecialchars($serverItem) : $key ?></a></li>
                                            <?php endforeach ?>
                                        </ul>
                                    </li>
                                <?php endif ?>

                                <?php if ($tube): ?>
                                    <!-- Tube dropdown: current, then All, then remaining -->
                                    <li class="nav-item dropdown">
                                        <a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown">
                                            <?php echo $tube ?> <span class="caret"></span>
                                        </a>
                                        <ul class="dropdown-menu" style="max-height: 350px;overflow-y: scroll;">
                                            <li><a class="dropdown-item fs-14px" href="./?server=<?php echo $server ?>">All Tubes</a></li>
                                            <?php foreach (array_diff($tubes, array($tube)) as $tubeItem): ?>
                                                <li><a class="dropdown-item  fs-14px" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tubeItem) ?>"><?php echo $tubeItem ?></a></li>
                                            <?php endforeach ?>
                                        </ul>
                                    </li>
                                <?php elseif (isset($tubes)): ?>
                                    <!-- Tube dropdown: All, then remaining -->
                                    <li class="nav-item dropdown">
                                        <a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown">
                                            All tubes <span class="caret"></span>
                                        </a>
                                        <ul class="dropdown-menu" style="max-height: 350px;overflow-y: scroll;">
                                            <?php foreach ($tubes as $tubeItem): ?>
                                                <li><a class="dropdown-item fs-14px" href="./?server=<?php echo $server ?>&tube=<?php echo urlencode($tubeItem) ?>"><?php echo $tubeItem ?></a></li>
                                            <?php endforeach; ?>
                                        </ul>
                                    </li>
                                <?php endif ?>
                            </ul>

                            <?php if (isset($server, $tube) && $server && $tube) { ?>
                                <form  class="d-flex" role="search" action="" method="get">
                                    <input type="hidden" name="server" value="<?php echo $server; ?>"/>
                                    <input type="hidden" name="tube" value="<?php echo urlencode($tube); ?>"/>
                                    <input type="hidden" name="state" value="<?php echo $state; ?>"/>
                                    <input type="hidden" name="action" value="search"/>
                                    <input type="hidden" name="limit" value="<?php echo empty($_COOKIE['searchResultLimit']) ? 25 : $_COOKIE['searchResultLimit']; ?>"/>
                                    <div class="form-group">
                                        <input type="text" class="form-control form-control-sm search-query" name="searchStr" placeholder="Search this tube">
                                    </div>
                                </form>
                            <?php } ?>

                            <ul class="nav navbar-nav navbar-right">
                                <li class="nav-item dropdown">
                                    <a href="#" class="nav-link" data-bs-toggle="dropdown">
                                        <i class="ri-equalizer-2-line d-none d-sm-block"></i>
                                            <span class="d-block d-sm-none text-start">Settings <span class="float-end"><i class="ri-equalizer-2-line pe-2"></i></span></span>
                                    </a>
                                    <ul class="dropdown-menu dropdown-menu-end" role="menu">
                                        <?php if (!isset($_tplPage) && !$server) { ?>
                                            <li><a class="dropdown-item fs-14px" href="#filterServer" role="button" data-bs-toggle="modal">Filter columns</a></li>
                                            <?php
                                        } elseif (!isset($_tplPage) && $server) {
                                            ?>
                                            <li><a class="dropdown-item fs-14px" href="#filter" role="button" data-bs-toggle="modal">Filter columns</a></li>
                                            <?php
                                        }
                                        if ($server && !$tube) {
                                            ?>
                                            <li><a class="dropdown-item fs-14px" href="#clear-tubes" role="button" data-bs-toggle="modal">Clear multiple tubes</a></li>
                                        <?php } ?>
                                        <li><a class="dropdown-item fs-14px" href="./?action=manageSamples" role="button">Manage samples</a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item fs-14px" href="https://github.com/kr/beanstalkd">Beanstalk (github) <i class="ri-external-link-fill"></i></a></li>
                                        <li><a class="dropdown-item fs-14px" href="https://github.com/kr/beanstalkd/blob/master/doc/protocol.txt">Protocol Specification <i class="ri-external-link-fill"></i></a></li>
                                        <li><a class="dropdown-item fs-14px" href="https://github.com/ptrofimov/beanstalk_console">Beanstalk console (github) <i class="ri-external-link-fill"></i></a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item fs-14px" href="#settings" role="button" data-bs-toggle="modal">Edit settings</a></li>

                                        <?php if (@$config['auth']['enabled']) { ?>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item-text fs-14px" target="_blank" href="./?logout=true" role="button">
                                                <button class="btn btn-sm btn-success w-100">Logout</button>
                                            </a>
                                        </li>
                                        <?php } ?>

                                    </ul>
                                </li>

                                <?php if ($server && !$tube) { ?>
                                    <li class="nav-item">
                                        <button type="button" id="autoRefresh" class="btn btn-default btn-sm rounded-4 float-end btn-circle p-0" data-bs-toggle="tooltip" data-bs-title="Toggle auto refresh">
                                            <i class="ri-refresh-line icon"></i>
                                            <span class="visually-hidden">New alerts</span>
                                        </button>
                                    </li>
                                <?php } else if (!$tube) { ?>
                                    <li class="nav-item">
                                        <button type="button" id="autoRefreshSummary" class="btn btn-default btn-sm rounded-4 float-end btn-circle p-0" data-bs-toggle="tooltip" data-bs-title="Toggle auto refresh">
                                            <i class="ri-refresh-line icon"></i>
                                            <span class="visually-hidden">New alerts</span>
                                        </button>
                                    </li>
                                <?php } ?>

                            </ul>
                            
                        </div>
                        <!--/.nav-collapse -->
                    </div>
                </nav>

                <div class="mx-3">
                    <?php endif ?>

                    <?php if (!empty($errors)): ?>
                        <?php foreach ($errors as $item): ?>
                            <p class="alert alert-error"><span class="label label-important">Error</span> <?php echo $item ?></p>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <?php if (isset($_tplPage)): ?>
                            <?php include(dirname(__FILE__) . '/' . $_tplPage . '.php') ?>
                        <?php elseif (!$server): ?>
                            <div id="idServers">
                                <?php
                                include(dirname(__FILE__) . '/serversList.php');
                                ?>
                            </div>
                            <div id="idServersCopy" style="display:none"></div>
                            <?php
                            if ($tplVars['_tplMain'] != 'ajax') {
                                require_once dirname(__FILE__) . '/modalAddServer.php';
                                require_once dirname(__FILE__) . '/modalFilterServer.php';
                            }
                            ?>
                        <?php elseif (!$tube):
                            ?>
                            <div id="idAllTubes">
                                <?php require_once dirname(__FILE__) . '/allTubes.php'; ?>
                                <?php require_once dirname(__FILE__) . '/modalClearTubes.php'; ?>
                            </div>
                            <div id='idAllTubesCopy' style="display:none"></div>
                        <?php elseif (!in_array($tube, $tubes)):
                            ?>
                            <?php echo sprintf('Tube "%s" not found or it is empty', $tube) ?>
                            <br><br><a href="./?server=<?php echo $server ?>"> << back </a>
                        <?php else:
                            ?>
                            <?php require_once dirname(__FILE__) . '/currentTube.php'; ?>
                            <?php require_once dirname(__FILE__) . '/modalAddJob.php'; ?>
                            <?php require_once dirname(__FILE__) . '/modalAddSample.php'; ?>
                        <?php endif; ?>
                        <?php if (!isset($_tplPage)) { ?>
                            <?php require_once dirname(__FILE__) . '/modalFilterColumns.php'; ?>
                        <?php } ?>
                        <?php require_once dirname(__FILE__) . '/modalSettings.php'; ?>
                    <?php endif; ?>
                </div>

        </div>

        <div class="scroll-top position-fixed bottom-0 end-0 me-4 mb-3 pe-3 d-none" title="scroll to top">
            <button type="button" class="btn btn-sm text-white btn-success rounded-circle p-0 btn-circle"><i class="ri-arrow-up-s-line icon"></i></button>
        </div>

        <script src='assets/vendor/jquery/jquery.js'></script>
        <script src="js/jquery.color.js"></script>
        <script src="js/jquery.cookie.js"></script>
        <script src="js/jquery.regexp.js"></script>
        <script src="assets/vendor/bootstrap/dist/js/bootstrap.bundle.min.js"></script>
        <script src="assets/vendor/json-viewer/jquery.json-viewer.js"></script>
        <?php if (isset($_COOKIE['isDisabledJobDataHighlight']) and $_COOKIE['isDisabledJobDataHighlight'] != 1) { ?>
            <script src="highlight/highlight.pack.js"></script>
            <script>hljs.initHighlightingOnLoad();</script><?php } ?>
        <script src="js/customer.js?_ver=<?php echo time(); ?>"></script>
    </body>
</html>
