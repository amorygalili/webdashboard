#!/usr/bin/env python
"""
    This is an example server application, using the tornado handlers,
    that you can use to connect your HTML/Javascript dashboard code to
    your robot via NetworkTables.
    Run this application with python, then you can open your browser to 
    http://localhost:8888/ to view the index.html page.
"""

import inspect
import os
from os.path import abspath, dirname, exists, join
from optparse import OptionParser

import tornado.web
from tornado.ioloop import IOLoop

from networktables import NetworkTables
from pynetworktables2js import get_handlers, NonCachingStaticFileHandler

try:
    import ujson as json
except ImportError:
    import json

import logging

logger = logging.getLogger("dashboard")

log_datefmt = "%H:%M:%S"
log_format = "%(asctime)s:%(msecs)03d %(levelname)-8s: %(name)-20s: %(message)s"

def pretty_json(d):
    return json.dumps(d, sort_keys=True, indent=4, separators=(',', ': '))


def init_networktables(options):
    NetworkTables.setNetworkIdentity(options.identity)

    if options.team:
        logger.info("Connecting to NetworkTables for team %s", options.team)
        NetworkTables.startClientTeam(options.team)
    else:
        logger.info("Connecting to networktables at %s", options.robot)
        NetworkTables.initialize(server=options.robot)

    if options.dashboard:
        logger.info("Enabling driver station override mode")
        NetworkTables.startDSClient()

    logger.info("Networktables Initialized")


class ApiHandler(tornado.web.RequestHandler):

    def initialize(self, dashboard_path):

        self.dashboard_path = dashboard_path
        

    def set_default_headers(self):
        '''Allow CORS requests from websim running on a different port in webpack'''
        
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Credentials", "true")
        self.set_header("Access-Control-Allow-Headers",
            "Content-Type, Depth, User-Agent, X-File-Size, X-Requested-With, X-Requested-By, If-Modified-Since, X-File-Name, Cache-Control")
        self.set_header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")

    def options(self, options):
        # no body
        self.set_status(204)
        self.finish()

    def get(self, param):
        '''
            GET handler
            
            Don't call this often, as it may block the tornado ioloop, which
            would be bad.. 
            
            :param param: The matching parameter for /api/(.*)
        '''
        
        if param == 'layout':
            layout = {}
            try: 
                with open(join(self.dashboard_path, 'layout.json'), 'r') as fp:
                    try:
                        layout = json.loads(fp.read())
                    except:
                        logger.error("Error reading config.json")
            except:
                pass

            self.write(layout)
        else:
            raise tornado.web.HTTPError(404)

    def post(self, param):

        '''
            POST handler
            
            Don't call this often, as it may block the tornado ioloop, which
            would be bad..
            
            :param param: The matching parameter for /api/(.*)
        '''
        
        if param == 'layout/save':
            
            data = json.loads(self.request.body.decode('utf-8'))
            
            with open(join(self.dashboard_path, 'layout.json'), 'w') as fp:
                fp.write(pretty_json(data))
            
        else:
            raise tornado.web.HTTPError(404)

class Main:
    '''Entrypoint called from wpilib.run'''


    def __init__(self, parser):

        parser.add_argument(
            "--port", type=int, default=8888, help="Port to run web server on"
        )

        parser.add_argument(
            '--verbose', type=bool, default=False, help='Enable verbose logging'
        )

        parser.add_argument(
            "--robot", default="127.0.0.1", help="Robot's IP address"
        )

        parser.add_argument(
            "--team", type=int, help="Team number of robot to connect to"
        )

        parser.add_argument(
            "--dashboard",
            type=bool,
            default=False,
            help="Use this instead of --robot to receive the IP from the driver station. WARNING: It will not work if you are not on the same host as the DS!",
        )

        parser.add_argument(
            "--identity", default="pynetworktables2js", help="Identity to send to NT server"
        )

    def run(self, options, robot_class, **kwargs):

        # Setup logging
        logging.basicConfig(
            datefmt=log_datefmt,
            format=log_format,
            level=logging.DEBUG if options.verbose else logging.INFO,
        )

        if options.team and options.robot != "127.0.0.1":
            raise Exception("--robot and --team are mutually exclusive")

        # Setup NetworkTables
        init_networktables(options)

        # setup tornado application with static handler + networktables support
        html_dir = abspath(join(dirname(__file__), "html", "dist"))
        index_html = join(html_dir, "index.html")
        vendor_dir = abspath(join(dirname(__file__), "html", "vendor"))

        # Path where user files are served from
        robot_file = abspath(inspect.getfile(robot_class))
        robot_path = dirname(robot_file)

        dashboard_path = join(robot_path, 'dashboard')
        if not exists(dashboard_path):
            os.mkdir(dashboard_path)

        app = tornado.web.Application(
            get_handlers()
            + [
                #(r'/user/(.*)', NonCachingStaticFileHandler, {'path': dashboard_path }),
                (r'/api/(.*)', ApiHandler, {'dashboard_path': dashboard_path}),
                (r"/()", NonCachingStaticFileHandler, {"path": index_html}),
                (r"/vendor/(.*)", NonCachingStaticFileHandler, {"path": vendor_dir}),
                (r"/(.*)", NonCachingStaticFileHandler, {"path": html_dir}),
            ]
        )

        # Start the app
        logger.info("Listening on http://localhost:%s/", options.port)

        app.listen(options.port)
        IOLoop.current().start()

