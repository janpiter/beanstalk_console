<div id="filterServer" data-cookie="filter" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="servers-add-label" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="filter-label">Filter columns</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form class="form-group">
                    <div class="tabbable">
                        <ul class="nav nav-tabs nav-justified" id="tab-filter-columns">
                            <?php
                            $i = 0;
                            foreach ($console->getServerStatsGroups() as $groupName => $fields): $i++;
                                ?>
                                <li class="nav-item  <?php if ($i == 1) echo 'active' ?>">
                                    <button class="nav-link text-body <?php if ($i == 1) echo 'active' ?>" id="<?php echo $groupName ?>-tab" data-bs-toggle="tab" data-bs-target="#<?php echo $groupName ?>" role="tab" type="button" aria-controls="<?php echo $groupName ?>"><?php echo ucfirst($groupName) ?></button>
                                </li>
                            <?php endforeach ?>
                        </ul>
                        <div class="tab-content" style="min-height: 350px;max-height: 350px;overflow-y: scroll;">
                            <?php
                            $i = 0;
                            foreach ($console->getServerStatsGroups() as $groupName => $fields): $i++;
                                ?>
                                <div class="tab-pane <?php if ($i == 1) echo 'active' ?> pt-3" id="<?php echo $groupName ?>" role="tabpanel" aria-labelledby="<?php echo $groupName ?>-tab" tabindex="0">
                                    <?php foreach ($fields as $key => $description): ?>
                                        <div class="form-check">
                                            <input type="checkbox" class="form-check-input" id="f-<?php echo $key ?>"name="<?php echo $key ?>" <?php if (in_array($key, $visible)) echo 'checked="checked"' ?>>
                                            <label class="form-check-label align-top ps-1" for="f-<?php echo $key ?>" style="max-width: 95%">
                                                <p class="fw-bold mb-0"><?php echo ucfirst(str_replace('-', ' ', $key)) ?></p>
                                                <p class="mb-2 text-secondary text-wrap lh-sm"><small><small><?php echo ucfirst($description) ?></small></small></p>
                                            </label>
                                        </div>  
                                    <?php endforeach ?>
                                </div>
                            <?php endforeach ?>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-sm btn-secondary" data-bs-dismiss="modal" aria-hidden="true">Close</button>
            </div>
        </div>
    </div>
</div>