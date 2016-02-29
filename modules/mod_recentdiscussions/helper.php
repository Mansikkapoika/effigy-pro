<?php
/**
 * @package		EasyDiscuss
 * @copyright	Copyright (C) 2010 Stack Ideas Private Limited. All rights reserved.
 * @license		GNU/GPL, see LICENSE.php
 *
 * EasyDiscuss is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
 * See COPYRIGHT.php for copyright notices and details.
 */
defined('_JEXEC') or die('Restricted access');

class modRecentDiscussionsHelper
{
	public static function getData( $params )
	{
		$db				= DiscussHelper::getDBO();
		$count			= (int) $params->get( 'count', 10 );
		$filter			= (int) $params->get( 'filter_option', 0 );
		$state			= (int) $params->get( 'filter_state', 0 );
		$includeSubcat	= (bool) $params->get( 'include_subcategories', 0 );

		$catId			= intval($params->get( 'category', 0));
		$tagId			= intval($params->get( 'tags', 0));

		$limitQuery		= '';
		$catQuery		= '';
		$exclusionQuery	= '';

		if( !empty($count) )
		{
			$limitQuery = 'LIMIT 0,' . $count;
		}

		if( $state == 1 )
		{
			// Unanswered
			$stateQuery	= ' AND a.`isresolve`=' . $db->Quote( 0 );
			$stateQuery	.= ' AND a.`answered`=' . $db->Quote( 0 );

			//Order query
			$orderBy = 'ORDER BY a.`replied` DESC ';
		}
		else
		{
			$stateQuery = '';

			$orderBy = 'ORDER BY a.`created` DESC ';
		}


		if( $filter == 0 || $filter == 1 )
		{
			if( $filter == 1 && !empty($catId) )
			{
				if( !$includeSubcat )
				{
					$catQuery = ' AND a.`category_id` = '.$db->quote( $catId ) . ' ';
				}
				else
				{
					$catIds = array( $catId );
					self::appendChildCategories( $catId , $catIds );

					JArrayHelper::toInteger($catIds);

					$catQuery = ' AND a.`category_id` IN (' . implode(',', $catIds) . ') ';
				}
			}

			$excludedCategories	= DiscussHelper::getPrivateCategories();

			if( !empty($excludedCategories) )
			{
				$exclusionQuery .= ' AND a.`category_id` NOT IN (' . implode(',', $excludedCategories) . ')';
			}

			$query	= 'SELECT a.*, (SELECT COUNT(1) FROM `#__discuss_posts` WHERE `parent_id` = a.`id` AND `published`="1") AS `num_replies` FROM ' . $db->nameQuote( '#__discuss_posts' ) . ' AS a '
					. 'WHERE a.`published`=' . $db->Quote( 1 ) . ' '
					. 'AND a.`parent_id`=' . $db->Quote( 0 ) . ' '
					. $catQuery
					. $exclusionQuery
					. $stateQuery
					. $groupByQuery
					. $orderBy
					. $limitQuery;
		}

		if( $filter == 2 )
		{
			$query = 'SELECT a.*, (SELECT COUNT(1) FROM `#__discuss_posts` WHERE `parent_id` = a.`id` AND `published`="1") AS `num_replies` '
					. ' FROM ' . $db->nameQuote( '#__discuss_posts' ) . ' AS a'
					. ' LEFT JOIN ' . $db->nameQuote( '#__discuss_posts_tags' ) . ' AS c'
					. ' ON a.' . $db->nameQuote( 'id' ) . '= c.' . $db->nameQuote( 'post_id' )
					. ' WHERE a.' . $db->nameQuote( 'published' ) . '=' . $db->Quote( 1 )
					. ' AND a.' . $db->nameQuote( 'parent_id' ) . '=' . $db->Quote( 0 )
					. ' AND b.' . $db->nameQuote( 'published' ) . '=' . $db->Quote( 1 )
					. ' AND c.' . $db->nameQuote( 'tag_id' ) . '=' . $db->Quote( $tagId )
					. $stateQuery
					. $groupByQuery
					. $orderBy
					. $limitQuery;
		}

		if( $filter == 3 )
		{
			// If featured post + unanswered settings in backend showing no post in the madule 
			// is because featured post considered as answered
			// this behaviour is respecting to the component's "unanswered tab"

			$query = 'SELECT a.*, (SELECT COUNT(1) FROM `#__discuss_posts` WHERE `parent_id` = a.`id` AND `published`="1") AS `num_replies` '
					. ' FROM ' . $db->nameQuote( '#__discuss_posts' ) . ' AS a'
					. ' WHERE a.' . $db->nameQuote( 'published' ) . '=' . $db->Quote( 1 )
					. ' AND a.' . $db->nameQuote( 'parent_id' ) . '=' . $db->Quote( 0 )
					. ' AND a.' . $db->nameQuote( 'featured' ) . '=' . $db->Quote( 1 )
					. $stateQuery
					. $groupByQuery
					. $orderBy
					. $limitQuery;
		}

		$db->setQuery( $query );

		if( !$result = $db->loadObjectList() )
		{
			return false;
		}

		$posts	= array();
		require_once DISCUSS_HELPERS . '/parser.php';

		foreach( $result as $row )
		{
			$profile = DiscussHelper::getTable( 'Profile' );
			$profile->load( $row->user_id );

			$row->profile	= $profile;
			$row->content	= EasyDiscussParser::bbcode( $row->content );

			$row->title		= DiscussHelper::wordFilter( $row->title );
			$row->content	= DiscussHelper::wordFilter( $row->content );

			// Process bbcode
			$row->content	= EasyDiscussParser::bbcode( $row->content );

			$posts[] = $row;
		}

		// Append profile objects to the result
		return $posts;
	}

	public static function appendChildCategories( $parentId, array &$holder )
	{
		$db = DiscussHelper::getDBO();

		$query	= 'SELECT id FROM ' . $db->nameQuote( '#__discuss_category' )
				. 'WHERE parent_id = ' . $db->quote( $parentId );

		$db->setQuery( $query );

		$childIds = $db->loadResultArray();

		if( count($childIds) > 0 )
		{
			$holder = array_merge($holder, $childIds);

			foreach( $childIds as $childId )
			{
				// We need to go deeper
				self::appendChildCategories( $childId, $holder );
			}
		}
	}
}
