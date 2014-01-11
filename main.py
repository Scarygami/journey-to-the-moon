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

phases = ["Moon", "Mars"]

def getImage(phase, p):
    if phase == 0:
        if p <= 15:
            return "/images/0.jpg"
        if p <= 30:
            return "/images/20.jpg"
        if p <= 45:
            return "/images/40.jpg"
        if p <= 60:
            return "/images/60.jpg"
        if p <= 80:
            return "/images/80.jpg"

        return "/images/100.jpg"

    return "/images/beyond.jpg"


class IndexHandler(webapp2.RequestHandler):
    """Renders the main page without any extras"""

    def get(self):

        self.response.out.write(TEMPLATE.render(
            {
                "title": "Journey to the Moon",
                "image": base_url + "/images/0.jpg",
                "description": "See how far you would have come to the moon during your travels."
            }
        ))

class ShareHandler(webapp2.RequestHandler):
    """Renders the main page with snippet info for sharing"""

    def get(self, p):

        perc = float(p)
        phase = 0
        while (perc > 100 and phase < len(phases) - 1):
            phase += 1
            perc -= 100

        self.response.out.write(TEMPLATE.render({
          "title": "Journey to the %s - %s%%" % (phases[phase], perc),
          "image": base_url + getImage(phase, perc),
          "description": "I'm %s%% on my way to the %s" % (perc, phases[phase])
        }))


class CompareHandler(webapp2.RequestHandler):
    """Renders the main page and displays a comparison"""

    def get(self, p):

        perc = float(p)
        phase = 0
        while (perc > 100 and phase < len(phases) - 1):
            phase += 1
            perc -= 100

        if perc > 100:
          perc2 = 100
        else:
          perc2 = perc

        self.response.out.write(TEMPLATE.render({
            "title": "Journey to the %s - %s%%" % (phases[phase], perc),
            "image": base_url + getImage(phase, perc),
            "description": "I'm %s%% on my way to the %s. How far are you?" % (perc, phases[phase]),
            "compare": True,
            "percent": perc2,
            "phase": phase + 1
        }))


app = webapp2.WSGIApplication([
    ("/", IndexHandler),
    (r"/p/([0-9]*\.?[0-9]+)", ShareHandler),
    (r"/c/p/([0-9]*\.?[0-9]+)", CompareHandler)
], debug=True)
