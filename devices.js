/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

"use strict";

// Supported devices: Eruption 0.3.0
var SUPPORTED_DEVICES = [
	{ make: "ROCCAT", model: "Vulcan 100/12x", usb_vid: 0x1e7d, usb_pid: 0x3098, has_status: false },
	{ make: "ROCCAT", model: "Vulcan 100/12x", usb_vid: 0x1e7d, usb_pid: 0x307a, has_status: false },

	{ make: "ROCCAT", model: "Vulcan Pro", usb_vid: 0x1e7d, usb_pid: 0x30f7, has_status: false },

	{ make: "ROCCAT", model: "Vulcan TKL", usb_vid: 0x1e7d, usb_pid: 0x2fee, has_status: false },

	{ make: "ROCCAT", model: "Vulcan Pro TKL", usb_vid: 0x1e7d, usb_pid: 0x311a, has_status: false },

	{ make: "ROCCAT", model: "Magma", usb_vid: 0x1e7d, usb_pid: 0x3124, has_status: false },

	{ make: "Corsair", model: "Corsair STRAFE Gaming Keyboard", usb_vid: 0x1b1c, usb_pid: 0x1b15, has_status: false },

	{ make: "ROCCAT", model: "Kone Aimo", usb_vid: 0x1e7d, usb_pid: 0x2e27, has_status: false },

	{ make: "ROCCAT", model: "Kone Aimo Remastered", usb_vid: 0x1e7d, usb_pid: 0x2e2c, has_status: false },

	{ make: "ROCCAT", model: "Kone XTD Mouse", usb_vid: 0x1e7d, usb_pid: 0x2e22, has_status: false },

	{ make: "ROCCAT", model: "Kone XP", usb_vid: 0x1e7d, usb_pid: 0x2c8b, has_status: false },

	{ make: "ROCCAT", model: "Kone Pure Ultra", usb_vid: 0x1e7d, usb_pid: 0x2dd2, has_status: false },

	{ make: "ROCCAT", model: "Burst Pro", usb_vid: 0x1e7d, usb_pid: 0x2de1, has_status: false },

	{ make: "ROCCAT", model: "Kone Pro Air Dongle", usb_vid: 0x1e7d, usb_pid: 0x2c8e, has_status: true },
	{ make: "ROCCAT", model: "Kone Pro Air", usb_vid: 0x1e7d, usb_pid: 0x2c92, has_status: true },

	{ make: "ROCCAT", model: "Kain 100 AIMO", usb_vid: 0x1e7d, usb_pid: 0x2d00, has_status: false },

	{ make: "ROCCAT", model: "Kain 200/202 AIMO", usb_vid: 0x1e7d, usb_pid: 0x2d5f, has_status: true },
	{ make: "ROCCAT", model: "Kain 200/202 AIMO", usb_vid: 0x1e7d, usb_pid: 0x2d60, has_status: true },

	{ make: "ROCCAT", model: "Kova AIMO", usb_vid: 0x1e7d, usb_pid: 0x2cf1, has_status: false },
	{ make: "ROCCAT", model: "Kova AIMO", usb_vid: 0x1e7d, usb_pid: 0x2cf3, has_status: false },

	{ make: "ROCCAT", model: "Kova 2016", usb_vid: 0x1e7d, usb_pid: 0x2cee, has_status: false },
	{ make: "ROCCAT", model: "Kova 2016", usb_vid: 0x1e7d, usb_pid: 0x2cef, has_status: false },
	{ make: "ROCCAT", model: "Kova 2016", usb_vid: 0x1e7d, usb_pid: 0x2cf0, has_status: false },

	{ make: "ROCCAT", model: "Nyth", usb_vid: 0x1e7d, usb_pid: 0x2e7c, has_status: false },
	{ make: "ROCCAT", model: "Nyth", usb_vid: 0x1e7d, usb_pid: 0x2e7d, has_status: false },

	{ make: "ROCCAT/Turtle Beach", model: "Elo 7.1 Air", usb_vid: 0x1e7d, usb_pid: 0x3a37, has_status: true },

	{ make: "ROCCAT", model: "Sense AIMO XXL", usb_vid: 0x1e7d, usb_pid: 0x343b, has_status: false }
];
