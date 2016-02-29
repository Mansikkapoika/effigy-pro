<?php
/**
 * @version    $Id$
 * @package    JSN_EasySlider
 * @author     JoomlaShine Team <support@joomlashine.com>
 * @copyright  Copyright (C) 2012 JoomlaShine.com. All Rights Reserved.
 * @license    GNU/GPL v2 or later http://www.gnu.org/licenses/gpl-2.0.html
 *
 * Websites: http://www.joomlashine.com
 * Technical Support:  Feedback - http://www.joomlashine.com/contact-us/get-support.html
 */

defined('_JEXEC') or die('Restricted access');

/**
 * slider model.
 *
 * @package  JSN_EasySlider
 * @since    1.0.0
 */
class JSNEasySliderModelRestAPI extends JSNBaseModel
{

    protected $option = "com_easyslider";

    /**
     * @param array $data
     * @param $table
     * @return string
     */
    public function createNewModel($data = array(), $table)
    {
        $results = array();
        $results['status'] = false;
        if (isset($data['data']))
        {
            $db = JFactory::getDbo();

            try
            {
                $query = $db->getQuery(true);

                // Insert columns.
                $columns = array('collection_id', 'name', 'data', 'type');

                // Insert values.
                $values = array($db->quote($data['collection_id']), $db->quote('default name'), $db->quote($data['data']), $db->quote($data['type']));

                // Prepare the insert query.
                $query
                    ->insert($db->quoteName($table))
                    ->columns($db->quoteName($columns))
                    ->values(implode(',', $values));

                $db->setQuery($query);
                $db->execute();

                $modelID = $db->insertid();

                $response = json_decode($data['data']);
                $response->id = $modelID;

                $results['status'] = true;
                $results['data'] = $response;
                return $results;
                exit();
            } catch (Exception $e)
            {
                // catch any database errors.
                return $results;
                exit();
            }
        }
        else
        {
            return $results;
            exit();
        }
    }

    /**
     * @param string $data
     * @param string $table
     * @return null|string
     */
    public function getData($data = '', $table = '')
    {
        $results = array();
        $results['status'] = false;
        $results['data'] = array();
        if (isset($data['collection_id']))
        {
            // Get a db connection.
            $db = JFactory::getDbo();

            // Create a new query object.
            $query = $db->getQuery(true);

            try
            {
                $query->select($db->quoteName(array('data', 'model_id')));
                $query->from($db->quoteName($table));

                //get model or collection
                if (isset($data['model_id']) && is_numeric($data['model_id']))
                {
                    $query->where(
                        $db->quoteName('model_id') . ' = ' . $db->quote($data['model_id']) .
                        ' AND ' . $db->quoteName('type') . ' = ' . $db->quote($data['type'])
                    );
                }
                else
                {
                    $query->where(
                        $db->quoteName('collection_id') . ' = ' . $db->quote($data['collection_id']) .
                        ' AND ' . $db->quoteName('type') . ' = ' . $db->quote($data['type'])
                    );
                }

                $query->order('model_id ASC');

                // Reset the query using our newly populated query object.
                $db->setQuery($query);

                // Load the results as a list of stdClass objects (see later for more options on retrieving data).
                $collection = $db->loadObjectList();
                if (empty($results)) $results['status'] = false;
                $results['status'] = true;
                if (isset($data['model_id']) && is_numeric($data['model_id']))
                {
                    $response = json_decode($collection[0]->data);
                    $response->id = $collection[0]->model_id;
                    $results['data'] = $response;
                }
                else
                {
                    $arrayModel = array();
                    foreach ($collection as $row)
                    {
                        $response = json_decode($row->data);
                        $response->id = $row->model_id;
                        array_push($arrayModel, $response);
                    }
                    $results['data'] = $arrayModel;
                }
                return $results;
                exit();
            } catch (Exception $e)
            {
                return $results;
                exit();
            }
        }
        else
        {
            return $results;
            exit();
        }
    }

    /**
     * @param int $modelID
     * @param string $table
     * @return string
     */
    public function deleteModel($modelID = 0, $table = '')
    {
        $db = JFactory::getDbo();
        $results = array();
        $results['status'] = false;
        try
        {
            $query = $db->getQuery(true);


            //delete data

            // delete model width mode_id
            $conditions = array(
                $db->quoteName('model_id') . ' = ' . $db->quote($modelID)
            );

            $query->delete($db->quoteName($table));
            $query->where($conditions);

            $db->setQuery($query);

            $db->execute();

            $results['status'] = true;
            $results['data'] = array();
            return $results;
            exit();
        } catch (Exception $e)
        {
            // catch any database errors.
            return $results;
            exit();
        }
    }

    /**
     * @param array $data
     * @param string $table
     * @return string
     */
    public function updateModel($data = array(), $table = '')
    {
        $db = JFactory::getDbo();
        $results = array();
        $results['status'] = false;
        try
        {
            $query = $db->getQuery(true);
            // Fields to update.
            $fields = array(
                $db->quoteName('data') . ' = ' . $db->quote($data['data'])
            );

            // Conditions for which records should be updated.
            $conditions = array(
                $db->quoteName('model_id') . ' = ' . $db->quote($data['model_id'])
            );

            $query->update($db->quoteName($table))->set($fields)->where($conditions);

            $db->setQuery($query);

            $db->execute();
            $results['status'] = true;
            $results['data'] = $data['data'];
            return $results;
            exit();
        } catch (Exception $e)
        {
            return $results;
            exit();
        }
    }

}
