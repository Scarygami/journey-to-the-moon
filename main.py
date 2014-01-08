#!/usr/bin/python

# Copyright (C) 2014 Gerwin Sturm, FoldedSoft e.U.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""RequestHandlers for Glass emulator and Demo services"""

__author__ = 'scarygami@gmail.com (Gerwin Sturm)'

import jinja2
import os
import webapp2

from google.appengine.api.app_identity import get_application_id

JINJA = jinja2.Environment(loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))
TEMPLATE = JINJA.get_template("templates/index.html")

appname = get_application_id()
base_url = "https://" + appname + ".appspot.com"

def getImage(p):
    if p <= 10:
        return "/images/0.jpg"
    if p <= 30:
        return "/images/20.jpg"
    if p <= 50:
        return "/images/40.jpg"
    if p <= 70:
        return "/images/60.jpg"
    if p <= 90:
        return "/images/80.jpg"

    return "/images/100.jpg"


class IndexHandler(webapp2.RequestHandler):
    """Renders the main page that is mainly used for authentication only so far"""

    def get(self):

        self.response.out.write(TEMPLATE.render(
            {
                "title": "Journey to the Moon",
                "image": base_url + "/images/0.jpg",
                "description": "See how far you would have come to the moon during your travels."
            }
        ))

class ShareHandler(webapp2.RequestHandler):
    """Renders the main page that is mainly used for authentication only so far"""

    def get(self, p):

        perc = float(p)
        self.response.out.write(TEMPLATE.render(
            {
                "title": "Journey to the Moon - %s%%" % perc,
                "image": base_url + getImage(perc),
                "description": "I'm %s%% on my way to the moon" % perc
            }
        ))


class CompareHandler(webapp2.RequestHandler):
    """Renders the main page that is mainly used for authentication only so far"""

    def get(self, p):

        perc = float(p)
        self.response.out.write(TEMPLATE.render(
            {
                "title": "Journey to the Moon - %s%%" % perc,
                "image": base_url + getImage(perc),
                "description": "I'm %s%% on my way to the moon. How far are you?" % perc,
                "compare": True,
                "percent": perc
            }
        ))


app = webapp2.WSGIApplication([
    ("/", IndexHandler),
    (r"/p/([0-9]*\.?[0-9]+)", ShareHandler),
    (r"/c/p/([0-9]*\.?[0-9]+)", CompareHandler)
], debug=True)
